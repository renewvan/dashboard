import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

function setup(heaters: Record<string, Heater>, props: Partial<HeaterPageProps> = {}) {
  stubMatchMedia(800)
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

  it('reads Unknown, with controls off, when the driver is not online', () => {
    setup({ cabin: RUNNING }, { driverOnline: false })
    expect(screen.getByText('Unknown')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('not online')
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled()
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
    const { user } = setup({ cabin: RUNNING })
    screen.getByRole('slider', { name: 'Target' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(handlers.onSetSetpoint).toHaveBeenCalledWith('cabin', 20)
    act(() => {
      vi.advanceTimersByTime(GIVE_UP_MS)
    })
    expect(screen.getByText("Target didn't change")).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Target' })).toHaveAttribute('aria-valuenow', '21')
  })

  it('disables everything in demo mode and sends nothing', async () => {
    const { user } = setup({ cabin: RUNNING }, { demo: true })
    expect(screen.getByRole('status')).toHaveTextContent('Demo mode')
    await user.click(screen.getByRole('button', { name: 'Stop' }))
    expect(handlers.onSetRunning).not.toHaveBeenCalled()
  })
})
