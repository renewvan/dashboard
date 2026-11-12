import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from '@heroui/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { stubMatchMedia } from '@/test/matchMedia'
import type { Heater } from '@/types'
import { GIVE_UP_MS, HeaterPage, type HeaterPageProps } from './HeaterPage'

const handlers = {
  onSetRunning: vi.fn(),
  onSetMode: vi.fn(),
  onSetSetpoint: vi.fn(),
  onSetPowerLevel: vi.fn(),
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

  it('shows the phase and readings', () => {
    setup({ cabin: RUNNING })
    // On both the dial (centre) and the status card.
    expect(screen.getAllByText('Running')).toHaveLength(2)
    expect(screen.getAllByText('19.4 °C')).toHaveLength(2)
    expect(screen.getByText('3000 rpm')).toBeInTheDocument()
  })

  it('runs a clock from the start, resyncs to the heater and resets when it is off', () => {
    const { rerender } = setup({ cabin: { ...OFF, runtime_s: 0 } })
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

  it('ends with Fuel pump, Runtime and Timer, in that order', () => {
    setup({ cabin: RUNNING })
    const labels = [...document.querySelectorAll('dt')].map((d) => d.textContent)
    expect(labels.slice(-3)).toEqual(['Fuel pump', 'Runtime', 'Timer'])
  })

  it('shows the timer Off and disabled on a real heater', () => {
    setup({ cabin: RUNNING })
    const timer = screen.getByRole('button', { name: /Timer/ })
    expect(timer).toBeDisabled()
    expect(timer).toHaveTextContent('Off')
  })

  it('picks a preset on the local heater', async () => {
    const onChange = vi.fn()
    const timerOnChange = vi.fn()
    const { user } = setup(
      { cabin: OFF },
      {
        localModes: {
          mode: 'temperature',
          onChange,
          timer: { minutes: 0, endsAt: undefined, onChange: timerOnChange },
        },
      },
    )
    await user.click(screen.getByRole('button', { name: /Timer/ }))
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Off',
      '30 min',
      '60 min',
      '90 min',
    ])
    await user.click(screen.getByRole('option', { name: '60 min' }))
    expect(timerOnChange).toHaveBeenCalledWith(60)
  })

  it('shows the time left while the countdown runs', () => {
    const onChange = vi.fn()
    const endsAt = Date.now() + 90_000
    setup(
      { cabin: RUNNING },
      {
        localModes: {
          mode: 'temperature',
          onChange,
          timer: { minutes: 30, endsAt, onChange: vi.fn() },
        },
      },
    )
    expect(screen.getByRole('button', { name: /Timer/ })).toHaveTextContent('1:30')
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

  it('leads the first card with the title and status, and titles the readings card, on a phone', () => {
    setup({ cabin: RUNNING }, {}, 400)
    const dial = screen.getByLabelText('Cabin heater setting')
    const title = within(dial).getByRole('heading', { name: 'Cabin heater' })
    expect(title).not.toHaveClass('sr-only')
    expect(dial).toHaveTextContent('Running')
    const status = screen.getByLabelText('Cabin heater status')
    expect(within(status).getByRole('heading', { name: 'Readings' })).toBeInTheDocument()
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

  it('says in the readings card, on a phone only, what the heater is doing, as Venus OS does', () => {
    setup({ cabin: RUNNING }, {}, 400)
    const readings = screen.getByLabelText('Cabin heater status')
    expect(within(readings).getByText('Heating to 21°C · room is 19°C')).toBeInTheDocument()
    cleanup()
    setup({ cabin: { ...RUNNING, mode: 'power' } }, {}, 400)
    expect(screen.getByText('Running at power level 4 · room is 19°C')).toBeInTheDocument()
    cleanup()
    setup({ cabin: OFF }, {}, 400)
    expect(screen.getByText('Maintain a target room temperature.')).toBeInTheDocument()
    cleanup()
    setup({ cabin: RUNNING })
    expect(screen.queryByText(/room is/)).not.toBeInTheDocument()
  })

  it('keeps Runtime beside the timer even when the heater is Unknown', () => {
    setup({ cabin: { name: 'Cabin heater', commands_enabled: true } })
    const cell = screen.getByText('Runtime').parentElement
    expect(cell).toHaveClass('col-start-1')
    expect(cell).toHaveTextContent('—')
    expect(cell?.nextElementSibling).toHaveTextContent('Timer')
  })

  it('reads Unknown when the driver cleared the live fields', () => {
    setup({ cabin: { name: 'Cabin heater', commands_enabled: true } })
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByText('No recent reading from the heater.')).toBeInTheDocument()
  })

  it('is read-only while the driver has commands off', () => {
    setup({ cabin: { ...OFF, commands_enabled: false } })
    expect(screen.getByText(/read-only/)).toBeInTheDocument()
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

  it('offers Ventilation and Heat + ventilation but cannot command them yet', () => {
    setup({ cabin: RUNNING })
    expect(screen.getByRole('radio', { name: 'Ventilation' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Heat + ventilation' })).toBeDisabled()
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
