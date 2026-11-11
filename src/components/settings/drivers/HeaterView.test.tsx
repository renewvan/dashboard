import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'
import type { Heater } from '@/types'

const HEATER: Heater = {
  name: 'Cabin heater',
  phase: 'running',
  status_code: '3.0',
  error_code: 0,
  internal_temperature_c: 19,
  heater_temperature_c: 80,
  voltage_v: 12.4,
  fan_rpm: 3000,
  fuel_pump_hz: 1.6,
  mode: 'heater_temperature',
  setpoint_c: 21,
  power_level: 4,
  commands_enabled: true,
}

const URL = '/?page=settings&view=heater'

describe('HeaterView', () => {
  it('is the Heater row on its Driver page, reading the sensor in use', async () => {
    const { user } = renderSettings(
      {},
      {
        url: '/?page=settings&view=driver&driver=domain:heater',
        bus: { heaters: { cabin: HEATER } },
      },
    )
    await user.click(screen.getByRole('button', { name: /Heater.*Heater sensor/ }))
    expect(screen.getByRole('radio', { name: 'Heater sensor' })).toBeChecked()
  })

  it('shows both sensors, the external probe disabled, when no probe is fitted', () => {
    renderSettings({}, { url: URL, bus: { heaters: { cabin: HEATER } } })
    expect(screen.getByRole('radio', { name: 'Heater sensor' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'External probe' })).toBeDisabled()
  })

  it('switches to the external probe when one is fitted', async () => {
    const setHeaterMode = vi.fn()
    const heater = { ...HEATER, external_temperature_c: 18 }
    const { user } = renderSettings(
      { setHeaterMode },
      { url: URL, bus: { heaters: { cabin: heater } } },
    )
    await user.click(screen.getByRole('radio', { name: 'External probe' }))
    expect(setHeaterMode).toHaveBeenCalledWith('cabin', 'external_temperature')
  })

  it('keeps the external probe listed while it is the sensor in use', () => {
    const heater = { ...HEATER, mode: 'external_temperature' as const }
    renderSettings({}, { url: URL, bus: { heaters: { cabin: heater } } })
    expect(screen.getByRole('radio', { name: 'External probe' })).toBeChecked()
  })

  it('is disabled in Power mode, and says why', () => {
    const heater = { ...HEATER, mode: 'power' as const }
    renderSettings({}, { url: URL, bus: { heaters: { cabin: heater } } })
    expect(screen.getByRole('radio', { name: 'Heater sensor' })).toBeDisabled()
    expect(screen.getByText(/Switch to Temperature mode/)).toBeInTheDocument()
  })

  it('is disabled while commands are off on the driver', () => {
    const heater = { ...HEATER, commands_enabled: false }
    renderSettings({}, { url: URL, bus: { heaters: { cabin: heater } } })
    expect(screen.getByRole('radio', { name: 'Heater sensor' })).toBeDisabled()
    expect(screen.getByText(/Commands are turned off/)).toBeInTheDocument()
  })
  it('asks before enabling controls, then sends the command', async () => {
    const setHeaterCommandsEnabled = vi.fn()
    const heater = { ...HEATER, commands_enabled: false }
    const { user } = renderSettings(
      { setHeaterCommandsEnabled },
      { url: URL, bus: { heaters: { cabin: heater } } },
    )
    await user.click(screen.getByRole('switch', { name: 'Heater controls' }))
    expect(setHeaterCommandsEnabled).not.toHaveBeenCalled()
    await user.click(await screen.findByRole('button', { name: 'Enable' }))
    expect(setHeaterCommandsEnabled).toHaveBeenCalledWith('cabin', true)
  })

  it('sends nothing when the confirmation is cancelled', async () => {
    const setHeaterCommandsEnabled = vi.fn()
    const heater = { ...HEATER, commands_enabled: false }
    const { user } = renderSettings(
      { setHeaterCommandsEnabled },
      { url: URL, bus: { heaters: { cabin: heater } } },
    )
    await user.click(screen.getByRole('switch', { name: 'Heater controls' }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))
    expect(setHeaterCommandsEnabled).not.toHaveBeenCalled()
  })

  it('asks before disabling controls that are on', async () => {
    const setHeaterCommandsEnabled = vi.fn()
    const { user } = renderSettings(
      { setHeaterCommandsEnabled },
      { url: URL, bus: { heaters: { cabin: HEATER } } },
    )
    const toggle = screen.getByRole('switch', { name: 'Heater controls' })
    expect(toggle).toBeChecked()
    await user.click(toggle)
    await user.click(await screen.findByRole('button', { name: 'Disable' }))
    expect(setHeaterCommandsEnabled).toHaveBeenCalledWith('cabin', false)
  })

  it('leaves the switch off-limits in demo mode', () => {
    renderSettings({ demoMode: true }, { url: URL, bus: { heaters: { cabin: HEATER } } })
    expect(screen.getByRole('switch', { name: 'Heater controls' })).toBeDisabled()
  })
})
