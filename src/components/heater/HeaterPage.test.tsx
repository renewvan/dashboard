import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@heroui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia } from '@/test/matchMedia'
import type { HeaterTimer } from '@/lib/heater'
import type { Heater } from '@/types'
import { GIVE_UP_MS, HeaterCard, HeaterPage, type HeaterPageProps } from './HeaterPage'

const handlers = {
  onSetRunning: vi.fn(),
  onSetMode: vi.fn(),
  onSetSetpoint: vi.fn(),
  onSetVentilating: vi.fn(),
  onSetPowerLevel: vi.fn(),
  onSetCommandsEnabled: vi.fn(),
}

const RUNNING: Heater = {
  name: 'Cabin heater',
  phase: 'running',
  status_code: '3.0',
  error_code: 0,
  internal_temperature_c: 19.44,
  heater_temperature_c: 80,
  voltage_v: 12.4,
  fan_rpm: 3000,
  fuel_pump_hz: 1.6,
  mode: 'heater_temperature',
  setpoint_c: 21,
  power_level: 4,
  commands_enabled: true,
}
const OFF: Heater = { ...RUNNING, phase: 'off', status_code: '0.1' }

function setup(heaters: Record<string, Heater>, props: Partial<HeaterPageProps> = {}, width = 800) {
  stubMatchMedia(width)
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const all: HeaterPageProps = {
    heaters,
    driverOnline: true,
    demo: false,
    ...handlers,
    ...props,
  }
  const view = render(<HeaterPage {...all} />)
  const rerender = (next: Record<string, Heater>) =>
    view.rerender(<HeaterPage {...all} heaters={next} />)
  return { user, rerender }
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  Object.values(handlers).forEach((fn) => fn.mockClear())
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('HeaterPage', () => {
  it('shows an empty state with no heater', () => {
    setup({})
    expect(screen.getByText('No heater yet.')).toBeInTheDocument()
  })

  it('shows the phase, the cabin reading and the sensor readouts as plain content', () => {
    setup({ cabin: RUNNING })
    // The phase is on the dial (centre); the title row holds the controls switch instead.
    expect(screen.getAllByText('Running')).toHaveLength(1)
    // On the dial, and as the Internal readout.
    expect(screen.getAllByText('19.4 °C')).toHaveLength(2)
    const readings = screen.getByLabelText('Cabin heater readings')
    expect(readings).toBeVisible()
    expect(readings).toHaveTextContent('3000 rpm')
    expect(readings).toHaveTextContent('Fuel pump')
  })

  it('turns the heater controls on and off from the switch in the dial card header', async () => {
    const { user } = setup({ cabin: RUNNING })
    const toggle = screen.getByRole('switch', { name: 'Cabin heater controls' })
    expect(toggle).toBeChecked()
    await user.click(toggle)
    expect(handlers.onSetCommandsEnabled).toHaveBeenCalledWith('cabin', false)
  })

  it('lists just the six readouts: no Runtime, no accordion, no timer dropdown, no settings button', () => {
    setup({ cabin: RUNNING })
    const labels = [...document.querySelectorAll('dt')].map((d) => d.textContent)
    expect(labels).toEqual(['External', 'Internal', 'Heater', 'Voltage', 'Fan', 'Fuel pump'])
    expect(screen.queryByRole('button', { name: 'Readings' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Timer/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Heater settings/ })).not.toBeInTheDocument()
  })

  it('heads the kiosk status card with a Timer title and a placeholder subtitle', () => {
    setup({ cabin: RUNNING })
    const status = screen.getByLabelText('Cabin heater status')
    expect(within(status).getByRole('heading', { name: 'Timer' })).toBeInTheDocument()
    expect(within(status).getByText('00:00')).toBeInTheDocument()
  })

  it('has no settings button without a way to open them', () => {
    setup({ cabin: RUNNING })
    expect(screen.queryByRole('button', { name: /Heater settings/ })).not.toBeInTheDocument()
  })

  it('runs a clock from the start, resyncs to the heater and resets when it is off', () => {
    // Runtime lives in the Start widget (the page no longer shows it).
    stubMatchMedia(800)
    const widget = (heater: Heater) => (
      <HeaterCard id="cabin" heater={heater} frozen={false} variant="widget" {...handlers} />
    )
    const view = render(widget({ ...OFF, runtime_s: 0 }))
    const rerender = (next: Record<string, Heater>) => view.rerender(widget(next.cabin))
    const clock = () => screen.getByText('Runtime').nextElementSibling?.textContent
    expect(clock()).toBe('0:00')
    // Off to on: counts from zero whatever the heater last reported.
    rerender({ cabin: { ...OFF, phase: 'starting', runtime_s: 900 } })
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(clock()).toBe('0:03')
    // The heater's own figure wins whenever it arrives, and the clock keeps counting from it.
    rerender({ cabin: { ...RUNNING, runtime_s: 125 } })
    expect(clock()).toBe('2:05')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(clock()).toBe('2:07')
    rerender({ cabin: { ...OFF, runtime_s: 130 } })
    expect(clock()).toBe('0:00')
  })

  const timerProps = (timer: Partial<HeaterTimer> = {}) => ({
    localModes: {
      mode: 'temperature' as const,
      onChange: vi.fn(),
      timer: {
        kind: 'off' as const,
        minutes: 0,
        endsAt: undefined,
        onChange: vi.fn(),
        onKindChange: vi.fn(),
        ...timer,
      },
    },
  })

  it('sets the timer with three combo boxes: On in / Off in, Hours and Minutes', async () => {
    const props = timerProps({ minutes: 90 })
    const { timer } = props.localModes
    const { user } = setup({ cabin: OFF }, props)
    // `hidden`: while one list is open or closing, React Aria hides the rest of the page from AT.
    const field = (name: string) => screen.getByRole('combobox', { name, hidden: true })
    expect(field('Timer type')).toHaveValue('Off in')
    expect(field('Hours')).toHaveValue('1 Hours')
    expect(field('Minutes')).toHaveValue('30 Min.')
    // Each pick keeps the other field: 2 hours + 30 min, then 1 hour + 45 min.
    await user.click(field('Hours'))
    await user.click(screen.getByRole('option', { name: '2 Hours' }))
    expect(timer.onChange).toHaveBeenLastCalledWith(150)
    await user.click(field('Minutes'))
    await user.click(screen.getByRole('option', { name: '45 Min.' }))
    expect(timer.onChange).toHaveBeenLastCalledWith(105)
    await user.click(field('Timer type'))
    await user.click(screen.getByRole('option', { name: 'On in' }))
    expect(timer.onKindChange).toHaveBeenCalledWith('on')
  })

  it('adds and takes off 30 minutes from the header buttons, within 00:00 to 23:59', async () => {
    const props = timerProps({ minutes: 30 })
    const { timer } = props.localModes
    const { user } = setup({ cabin: OFF }, props)
    await user.click(screen.getByRole('button', { name: 'Add 30 minutes' }))
    expect(timer.onChange).toHaveBeenLastCalledWith(60)
    await user.click(screen.getByRole('button', { name: 'Subtract 30 minutes' }))
    expect(timer.onChange).toHaveBeenLastCalledWith(0)
    cleanup()
    setup({ cabin: OFF }, timerProps({ minutes: 0 }))
    expect(screen.getByRole('button', { name: 'Subtract 30 minutes' })).toBeDisabled()
    cleanup()
    setup({ cabin: OFF }, timerProps({ minutes: 23 * 60 + 59 }))
    expect(screen.getByRole('button', { name: 'Add 30 minutes' })).toBeDisabled()
  })

  it('disables the header buttons on a real heater', () => {
    setup({ cabin: RUNNING })
    expect(screen.getByRole('button', { name: 'Add 30 minutes' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Subtract 30 minutes' })).toBeDisabled()
  })

  it('leaves the timer at 00:00 and its pickers disabled on a real heater', () => {
    setup({ cabin: RUNNING })
    for (const name of ['Timer type', 'Hours', 'Minutes']) {
      expect(screen.getByRole('combobox', { name })).toBeDisabled()
    }
    // Title and subtitle of the card.
    const status = screen.getByLabelText('Cabin heater status')
    expect(
      within(status).getByRole('heading', { name: 'Timer' }).nextElementSibling,
    ).toHaveTextContent('00:00')
  })

  it('shows the armed time as the subtitle, and the time left while a countdown runs', () => {
    const endsAt = Date.now() + 90_000
    setup({ cabin: RUNNING }, timerProps({ minutes: 30, endsAt }))
    const subtitle = within(screen.getByLabelText('Cabin heater status')).getByRole('heading', {
      name: 'Timer',
    }).nextElementSibling
    expect(subtitle).toHaveTextContent('1:30')
    cleanup()
    setup({ cabin: OFF }, timerProps({ minutes: 75 }))
    expect(
      within(screen.getByLabelText('Cabin heater status')).getByRole('heading', { name: 'Timer' })
        .nextElementSibling,
    ).toHaveTextContent('01:15')
  })

  it('reads Unknown, with controls off, when the driver is not online', () => {
    setup({ cabin: RUNNING }, { driverOnline: false })
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('not online')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
  })

  it('puts the title and status in the dial card on the kiosk', () => {
    setup({ cabin: RUNNING })
    const dial = screen.getByLabelText('Cabin heater setting')
    expect(within(dial).getByRole('heading', { name: 'Cabin heater' })).toBeInTheDocument()
    expect(dial).toHaveTextContent('Running')
    const status = screen.getByLabelText('Cabin heater status')
    expect(within(status).queryByRole('heading', { name: 'Cabin heater' })).not.toBeInTheDocument()
  })

  it('leads the first card with the title and status, and heads the status card with the timer, on a phone', () => {
    setup({ cabin: RUNNING }, {}, 400)
    const dial = screen.getByLabelText('Cabin heater setting')
    const title = within(dial).getByRole('heading', { name: 'Cabin heater' })
    expect(title).not.toHaveClass('sr-only')
    expect(dial).toHaveTextContent('Running')
    const status = screen.getByLabelText('Cabin heater status')
    expect(within(status).getByRole('heading', { name: 'Timer' })).toBeInTheDocument()
    expect(within(status).queryByRole('heading', { name: 'Cabin heater' })).not.toBeInTheDocument()
  })

  it('puts Start under the mode buttons on a phone, and in the status card on the kiosk', () => {
    setup({ cabin: OFF }, {}, 400)
    const dial = screen.getByLabelText('Cabin heater setting')
    const status = screen.getByLabelText('Cabin heater status')
    const modes = within(dial).getByRole('radiogroup')
    const start = within(dial).getByRole('button', { name: 'Start' })
    expect(modes.compareDocumentPosition(start) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(status).queryByRole('button', { name: 'Start' })).not.toBeInTheDocument()
    cleanup()
    setup({ cabin: OFF })
    expect(
      within(screen.getByLabelText('Cabin heater status')).getByRole('button', { name: 'Start' }),
    ).toBeInTheDocument()
    expect(
      within(screen.getByLabelText('Cabin heater setting')).queryByRole('button', {
        name: 'Start',
      }),
    ).not.toBeInTheDocument()
  })

  it('says, right above Start/Stop, what the mode does and what the heater is doing, as Venus OS does', () => {
    setup({ cabin: RUNNING }, {}, 400)
    const info = screen.getByText('Heating to 21°C · room is 19°C')
    // The line shares its wrapper with the Stop button, and comes first.
    expect(info.parentElement).toContainElement(screen.getByRole('button', { name: 'Stop' }))
    expect(info.compareDocumentPosition(screen.getByRole('button', { name: 'Stop' }))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
    cleanup()
    setup({ cabin: { ...RUNNING, mode: 'power' } }, {}, 400)
    expect(screen.getByText('Running at power level 4 · room is 19°C')).toBeInTheDocument()
    cleanup()
    setup({ cabin: OFF }, {}, 400)
    expect(screen.getByText('Maintain a target room temperature.')).toBeInTheDocument()
    cleanup()
    // The kiosk's status card says it too.
    setup({ cabin: RUNNING })
    expect(screen.getByText('Heating to 21°C · room is 19°C')).toBeInTheDocument()
  })

  it('shows just one info line: the commands-off notice outranks the mode text', () => {
    setup({ cabin: { ...OFF, commands_enabled: false } })
    expect(screen.getByText('Read-only! - Commands are turned off.')).toBeVisible()
    expect(screen.queryByText('Maintain a target room temperature.')).not.toBeInTheDocument()
  })

  it('reads Unknown when the driver cleared the live fields', () => {
    setup({ cabin: { name: 'Cabin heater', commands_enabled: true } })
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('No recent reading from the heater.')).toBeInTheDocument()
  })

  it('is read-only while the driver has commands off', () => {
    setup({ cabin: { ...OFF, commands_enabled: false } })
    expect(screen.getByText(/read-only/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    expect(screen.getByRole('slider', { name: 'Target' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('asks before starting, then sends true and waits for the phase to move', async () => {
    const { user, rerender } = setup({ cabin: OFF })
    await user.click(screen.getByRole('button', { name: 'Start' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(handlers.onSetRunning).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Start' }))
    expect(handlers.onSetRunning).toHaveBeenCalledWith('cabin', true)
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
    rerender({ cabin: { ...OFF, phase: 'starting' } })
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled()
  })

  it('sends nothing when the start prompt is cancelled', async () => {
    const { user } = setup({ cabin: OFF })
    await user.click(screen.getByRole('button', { name: 'Start' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(handlers.onSetRunning).not.toHaveBeenCalled()
  })

  it('does not offer Start with a fault', () => {
    setup({ cabin: { ...OFF, error_code: 30 } })
    expect(screen.getByRole('alert')).toHaveTextContent('error 30')
    expect(screen.getByRole('button', { name: 'Start' })).toBeDisabled()
  })

  it('stops with one tap and no prompt', async () => {
    const { user } = setup({ cabin: RUNNING })
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(handlers.onSetRunning).toHaveBeenCalledWith('cabin', false)
  })

  it('sends the target from the dial and waits for the heater to read it back', async () => {
    const { user, rerender } = setup({ cabin: RUNNING })
    const dial = screen.getByRole('slider', { name: 'Target' })
    dial.focus()
    await user.keyboard('{ArrowUp}')
    expect(handlers.onSetSetpoint).toHaveBeenCalledWith('cabin', 22)
    expect(dial).toHaveAttribute('aria-valuenow', '22')
    expect(dial).toHaveAttribute('aria-disabled', 'true')
    rerender({ cabin: { ...RUNNING, setpoint_c: 22 } })
    expect(screen.getByRole('slider', { name: 'Target' })).toHaveAttribute('aria-disabled', 'false')
  })

  it('dials the power level in fixed-power mode and stops at its end', async () => {
    const { user } = setup({
      cabin: { ...RUNNING, mode: 'power', power_level: 9 },
    })
    const dial = screen.getByRole('slider', { name: 'Power' })
    dial.focus()
    await user.keyboard('{ArrowUp}')
    expect(handlers.onSetPowerLevel).not.toHaveBeenCalled()
    await user.keyboard('{ArrowDown}')
    expect(handlers.onSetPowerLevel).toHaveBeenCalledWith('cabin', 8)
  })

  it('refuses settings while the heater is shutting down', () => {
    setup({ cabin: { ...RUNNING, phase: 'shutting_down' } })
    expect(screen.getByRole('slider', { name: 'Target' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('reports a setting that the heater never confirmed', async () => {
    const danger = vi.spyOn(toast, 'danger').mockReturnValue('t')
    const { user } = setup({ cabin: RUNNING })
    screen.getByRole('slider', { name: 'Target' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(handlers.onSetSetpoint).toHaveBeenCalledWith('cabin', 20)
    act(() => {
      vi.advanceTimersByTime(GIVE_UP_MS)
    })
    expect(danger).toHaveBeenCalledWith("Target didn't change", { description: 'Cabin heater' })
    expect(screen.queryByText("Target didn't change")).not.toBeInTheDocument()
    danger.mockRestore()
    expect(screen.getByRole('slider', { name: 'Target' })).toHaveAttribute('aria-valuenow', '21')
  })

  it('keeps Stop usable, and reports nothing, once the heater answered a start', async () => {
    const danger = vi.spyOn(toast, 'danger').mockReturnValue('t')
    const { user, rerender } = setup({ cabin: OFF })
    await user.click(screen.getByRole('button', { name: 'Start' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Start' }))
    rerender({ cabin: { ...OFF, phase: 'running' } })
    act(() => {
      vi.advanceTimersByTime(GIVE_UP_MS)
    })
    expect(danger).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled()
    danger.mockRestore()
  })

  it('switches to Power from a temperature mode', async () => {
    const { user } = setup({ cabin: RUNNING })
    expect(screen.getByRole('radio', { name: 'Temperature' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Power' }))
    expect(handlers.onSetMode).toHaveBeenCalledWith('cabin', 'power')
  })

  it('returns to the sensor it was last using when switching back to Temperature', async () => {
    const { user, rerender } = setup({ cabin: { ...RUNNING, mode: 'external_temperature' } })
    rerender({ cabin: { ...RUNNING, mode: 'power' } })
    await user.click(screen.getByRole('radio', { name: 'Temperature' }))
    expect(handlers.onSetMode).toHaveBeenCalledWith('cabin', 'external_temperature')
  })

  it('can command Ventilation but not Heat + ventilation yet', () => {
    setup({ cabin: RUNNING })
    expect(screen.getByRole('radio', { name: 'Ventilation' })).toBeEnabled()
    expect(screen.getByRole('radio', { name: 'Heat + ventilation' })).toBeDisabled()
  })

  it('selects ventilation from off without starting, and Start then runs it on its own topic', async () => {
    const { user } = setup({ cabin: { ...OFF, mode: 'power' } })
    await user.click(screen.getByRole('radio', { name: 'Ventilation' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Ventilation' })).toBeChecked()
    expect(handlers.onSetVentilating).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/Start ventilation on/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Start ventilation' }))
    expect(handlers.onSetVentilating).toHaveBeenCalledWith('cabin', true)
    expect(handlers.onSetRunning).not.toHaveBeenCalled()
    expect(handlers.onSetMode).not.toHaveBeenCalled()
  })

  it('forgets the ventilation choice once the heater has run, so a later Start heats', async () => {
    const { user, rerender } = setup({ cabin: { ...OFF, mode: 'power' } })
    await user.click(screen.getByRole('radio', { name: 'Ventilation' }))
    // Started and stopped from the panel in the meantime.
    rerender({ cabin: { ...OFF, mode: 'power', phase: 'running', status_code: '3.0' } })
    rerender({ cabin: { ...OFF, mode: 'power' } })
    expect(screen.getByRole('radio', { name: 'Power' })).toBeChecked()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    await user.click(
      within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Start' }),
    )
    expect(handlers.onSetRunning).toHaveBeenCalledWith('cabin', true)
    expect(handlers.onSetVentilating).not.toHaveBeenCalled()
  })

  it('stops a running heater first, then selects ventilation without starting it', async () => {
    const { user, rerender } = setup({ cabin: RUNNING })
    await user.click(screen.getByRole('radio', { name: 'Ventilation' }))
    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Stop heater' }))
    expect(handlers.onSetRunning).toHaveBeenCalledWith('cabin', false)
    expect(handlers.onSetVentilating).not.toHaveBeenCalled()
    rerender({ cabin: { ...RUNNING, phase: 'off' } })
    expect(handlers.onSetVentilating).not.toHaveBeenCalled()
    expect(screen.getByRole('radio', { name: 'Ventilation' })).toBeChecked()
  })

  it('lists Thermostat too, disabled on a real heater', () => {
    setup({ cabin: RUNNING })
    expect(screen.getByRole('radio', { name: 'Thermostat' })).toBeDisabled()
  })

  it('lets the local heater pick every mode', async () => {
    const onChange = vi.fn()
    const { user } = setup({ cabin: OFF }, { localModes: { mode: 'temperature', onChange } })
    await user.click(screen.getByRole('radio', { name: 'Thermostat' }))
    expect(onChange).toHaveBeenCalledWith('thermostat', 'heater_temperature')
    await user.click(screen.getByRole('radio', { name: 'Ventilation' }))
    expect(onChange).toHaveBeenCalledWith('ventilation', 'heater_temperature')
    expect(handlers.onSetMode).not.toHaveBeenCalled()
  })

  it('is warm while running, and blue in Ventilation', () => {
    const { rerender } = setup({ cabin: RUNNING })
    const tone = () =>
      document
        .querySelector<HTMLElement>('[aria-label="Cabin heater setting"]')
        ?.style.getPropertyValue('--tone')
    expect(tone()).toBe('var(--warning)')
    rerender({ cabin: { ...RUNNING, ventilating: true } })
    expect(tone()).toBe('var(--accent)')
  })

  it('offers to stop first when leaving Ventilation while the heater runs, then switches once off', async () => {
    const onChange = vi.fn()
    const { user, rerender } = setup(
      { cabin: RUNNING },
      { localModes: { mode: 'ventilation', onChange } },
    )
    await user.click(screen.getByRole('radio', { name: 'Temperature' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Switch to Temperature?')
    expect(dialog).toHaveTextContent('Stop the heater first?')
    expect(onChange).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Stop heater' }))
    expect(handlers.onSetRunning).toHaveBeenCalledWith('cabin', false)
    expect(onChange).not.toHaveBeenCalled()
    rerender({ cabin: { ...RUNNING, phase: 'off' } })
    expect(onChange).toHaveBeenCalledWith('temperature', 'heater_temperature')
  })

  it('offers to stop first when entering Ventilation from a heating mode', async () => {
    const onChange = vi.fn()
    const { user } = setup({ cabin: RUNNING }, { localModes: { mode: 'temperature', onChange } })
    await user.click(screen.getByRole('radio', { name: 'Ventilation' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Switch to Ventilation?')
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(handlers.onSetRunning).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('switches between heating modes while running without asking', async () => {
    const onChange = vi.fn()
    const { user } = setup({ cabin: RUNNING }, { localModes: { mode: 'temperature', onChange } })
    await user.click(screen.getByRole('radio', { name: 'Power' }))
    expect(onChange).toHaveBeenCalledWith('power', 'heater_temperature')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('switches into and out of Ventilation once the heater is off', () => {
    const onChange = vi.fn()
    setup({ cabin: OFF }, { localModes: { mode: 'ventilation', onChange } })
    expect(screen.getByRole('radio', { name: 'Temperature' })).toBeEnabled()
    expect(screen.getByRole('radio', { name: 'Thermostat' })).toBeEnabled()
  })

  it('shows a fan-only heater as Ventilation', () => {
    setup({ cabin: { ...RUNNING, ventilating: true } })
    expect(screen.getByRole('radio', { name: 'Ventilation' })).toBeChecked()
  })

  it('has no sensor dropdown: the sensor is chosen in Settings', () => {
    setup({ cabin: { ...RUNNING, external_temperature_c: 18 } })
    expect(screen.queryByRole('button', { name: /Temperature sensor/ })).not.toBeInTheDocument()
  })

  it('disables everything in demo mode and sends nothing', async () => {
    const { user } = setup({ cabin: RUNNING }, { demo: true })
    expect(screen.getByRole('status')).toHaveTextContent('Demo mode')
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(handlers.onSetRunning).not.toHaveBeenCalled()
  })
})
