import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router, TemperatureSensor } from '../types'
import { SettingsTab, type SettingsTabProps } from './SettingsTab'

const connectedTailscale = {
  enabled: true,
  connected: true,
  ip: '100.64.0.1',
  hostname: 'renewvan',
  peers: 1,
}

const liveRouter: Router = {
  signal_rsrp_dbm: -85,
  signal_rsrq_db: -10,
  signal_sinr_db: 6,
  signal_rssi_dbm: -54,
  operator: '26203',
  network_type: 'lte',
  uptime_s: 826_671,
  data_used_month_tx_b: 140.2 * 1024 * 1024,
  data_used_month_rx_b: 385.1 * 1024 * 1024,
}

function displaySettingsProps(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    tailscale: connectedTailscale,
    brightness: 70,
    autoSleepEnabled: false,
    autoSleepTimeoutMinutes: 5,
    onBrightnessChange: vi.fn(),
    onAutoSleepEnabledChange: vi.fn(),
    onAutoSleepTimeoutMinutesChange: vi.fn(),
    temperatures: {},
    onTemperatureNameChange: vi.fn(),
    onTemperatureUnitChange: vi.fn(),
    portalContainer: null,
    active: true,
    router: liveRouter,
    routerHealth: 'online',
    routerUpdatedAt: Date.now(),
    busStatus: 'connected',
    ...overrides,
  }
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('SettingsTab', () => {
  it('lists Display and Network as groups, not a flat Tailscale row', () => {
    render(<SettingsTab {...displaySettingsProps()} />)
    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
    expect(screen.queryByTestId('tailscale-status')).not.toBeInTheDocument()
  })

  it('defaults to subpage navigation and shows Tailscale status after opening Network', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('Network'))
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('100.64.0.1')
  })

  it('network subpage lists the hub link dot row and every router field', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('Network'))

    expect(screen.getByTestId('bus-status')).toHaveTextContent('Connected')
    expect(screen.getByText('Operator')).toBeInTheDocument()
    expect(screen.getByText('O2')).toBeInTheDocument()
    expect(screen.getByText('LTE')).toBeInTheDocument()
    expect(screen.getByText('-10 dB')).toBeInTheDocument()
    expect(screen.getByText('6 dB')).toBeInTheDocument()
    expect(screen.getByText('-54 dBm')).toBeInTheDocument()
    expect(screen.getByText('9d 13h')).toBeInTheDocument()
    expect(screen.getByText(/↓ 385\.1 MB · ↑ 140\.2 MB/)).toBeInTheDocument()
  })

  it('degrades missing router fields to em-dashes, not hidden rows', async () => {
    const user = userEvent.setup()
    render(
      <SettingsTab
        {...displaySettingsProps({ router: { signal_rsrp_dbm: -85 }, routerUpdatedAt: Date.now() })}
      />,
    )
    await user.click(screen.getByText('Network'))

    expect(screen.getByText('-85 dBm')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('deep-links straight into the Network subpage via focusView', () => {
    render(<SettingsTab {...displaySettingsProps({ focusView: 'network' })} />)
    expect(screen.getByTestId('tailscale-status')).toBeInTheDocument()
    expect(screen.getByTestId('bus-status')).toBeInTheDocument()
  })

  it('reports focusView as consumed so a repeat CTA tap re-triggers the jump', () => {
    // App clears focusView once fired; without the callback a second tap
    // with the same value would be a no-op and dead-end on the list.
    const onFocusConsumed = vi.fn()
    const { rerender } = render(
      <SettingsTab {...displaySettingsProps({ focusView: 'network', onFocusConsumed })} />,
    )
    expect(onFocusConsumed).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('bus-status')).toBeInTheDocument()

    // Consumed (App cleared it): stays put, does not re-fire.
    rerender(<SettingsTab {...displaySettingsProps({ onFocusConsumed })} />)
    expect(onFocusConsumed).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('bus-status')).toBeInTheDocument()
  })

  it('plain sidebar entry still lands on the list when focusView is unset', () => {
    render(<SettingsTab {...displaySettingsProps()} />)
    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.queryByTestId('tailscale-status')).not.toBeInTheDocument()
  })

  it('shows loading state when tailscale is null', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps({ tailscale: null })} />)
    await user.click(screen.getByText('Network'))
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/loading/i)
  })

  it('shows not authenticated when enabled but not connected', async () => {
    const user = userEvent.setup()
    render(
      <SettingsTab
        {...displaySettingsProps({ tailscale: { ...connectedTailscale, connected: false } })}
      />,
    )
    await user.click(screen.getByText('Network'))
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/not authenticated/i)
  })

  it('shows not installed when tailscale is not enabled', async () => {
    const user = userEvent.setup()
    render(
      <SettingsTab
        {...displaySettingsProps({
          tailscale: { ...connectedTailscale, connected: false, enabled: false },
        })}
      />,
    )
    await user.click(screen.getByText('Network'))
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/not installed/i)
  })

  it('subpage style: back chevron returns to the group list', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('Display'))
    expect(screen.getByText('Brightness')).toBeInTheDocument()
    await user.click(screen.getByText('Settings'))
    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.queryByText('Brightness')).not.toBeInTheDocument()
  })

  it('resets to the top-level list when the sidebar navigates away and back', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('Display'))
    expect(screen.getByText('Brightness')).toBeInTheDocument()

    // Base UI's Tabs.Panel keeps this component mounted while another
    // sidebar tab is selected (only `active` flips), so a stale drill-down
    // `view` would otherwise survive the round trip.
    rerender(<SettingsTab {...displaySettingsProps({ active: false })} />)
    rerender(<SettingsTab {...displaySettingsProps({ active: true })} />)

    expect(screen.queryByText('Brightness')).not.toBeInTheDocument()
    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.getByText('Network')).toBeInTheDocument()
  })

  it('switching to sheet navigation opens Display in a dialog', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('Display'))
    await user.click(screen.getByText('Navigation style'))
    await user.click(screen.getByText('Sheets'))
    // Closing the now-sheet-rendered Navigation dialog falls back to its
    // logical parent (Display), so it reopens immediately as a sheet too.
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Brightness')).toBeInTheDocument()
  })

  it('persists the chosen navigation style across remounts', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('Display'))
    await user.click(screen.getByText('Navigation style'))
    await user.click(screen.getByText('Sheets'))
    unmount()
    render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('Display'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('reflects the bus-backed brightness value and calls onBrightnessChange on drag', async () => {
    const onBrightnessChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <SettingsTab {...displaySettingsProps({ brightness: 42, onBrightnessChange })} />,
    )
    await user.click(screen.getByText('Display'))
    expect(screen.getByText('42%')).toBeInTheDocument()
    // Base UI's Slider thumb stays `visibility: hidden` until it measures
    // real layout (getBoundingClientRect), which jsdom always reports as
    // zero -- so the thumb (and its role="slider" input) never enters the
    // accessibility tree here. Query the native range input directly and
    // drive it with a real input event instead of role/keyboard.
    const input = container.querySelector('input[type="range"]') as HTMLInputElement
    fireEvent.input(input, { target: { value: '43' } })
    expect(onBrightnessChange).toHaveBeenCalledWith(43)
  })

  it('disables the brightness slider until a retained value arrives', async () => {
    const user = userEvent.setup()
    const { container } = render(<SettingsTab {...displaySettingsProps({ brightness: null })} />)
    await user.click(screen.getByText('Display'))
    const input = container.querySelector('input[type="range"]') as HTMLInputElement
    expect(input).toBeDisabled()
  })

  it('calls onAutoSleepTimeoutMinutesChange when a preset is picked', async () => {
    const onAutoSleepTimeoutMinutesChange = vi.fn()
    const user = userEvent.setup()
    render(
      <SettingsTab
        {...displaySettingsProps({
          autoSleepEnabled: true,
          autoSleepTimeoutMinutes: 5,
          onAutoSleepTimeoutMinutesChange,
        })}
      />,
    )
    await user.click(screen.getByText('Display'))
    await user.click(screen.getByText('15m'))
    expect(onAutoSleepTimeoutMinutesChange).toHaveBeenCalledWith(15)
  })

  describe('Temperature group', () => {
    const sensor = (over: Partial<TemperatureSensor> = {}): TemperatureSensor => ({
      name: 'Outdoor',
      unit: 'C',
      source: 'w1',
      serial: '28-000000259026',
      temperature_c: 31.4,
      status: 'ok',
      ...over,
    })

    it('summarises the sensor count on the group row', () => {
      render(
        <SettingsTab
          {...displaySettingsProps({ temperatures: { outdoor: sensor(), indoor: sensor() } })}
        />,
      )
      expect(screen.getByText('Temperature')).toBeInTheDocument()
      expect(screen.getByText('2 sensors')).toBeInTheDocument()
    })

    it('says so when no sensor has published yet', async () => {
      const user = userEvent.setup()
      render(<SettingsTab {...displaySettingsProps()} />)
      expect(screen.getByText('No sensors found')).toBeInTheDocument()
      await user.click(screen.getByText('Temperature'))
      expect(screen.getByText(/No temperature sensors found/)).toBeInTheDocument()
    })

    it('lists each sensor with its name, serial and current value in its own unit', async () => {
      const user = userEvent.setup()
      render(
        <SettingsTab
          {...displaySettingsProps({
            temperatures: {
              outdoor: sensor({ unit: 'F', temperature_c: 0 }),
              indoor: sensor({ name: 'Indoor', serial: '28-0623641a2877', temperature_c: 22 }),
            },
          })}
        />,
      )
      await user.click(screen.getByText('Temperature'))
      const outdoor = screen.getByTestId('temperature-sensor-outdoor')
      expect(outdoor).toHaveTextContent('28-000000259026')
      expect(outdoor).toHaveTextContent('32°F')
      expect(screen.getByLabelText('Name for outdoor')).toHaveValue('Outdoor')
      expect(screen.getByTestId('temperature-sensor-indoor')).toHaveTextContent('22°C')
    })

    it('does not show a stale reading for a sensor that is no longer ok', async () => {
      const user = userEvent.setup()
      render(
        <SettingsTab
          {...displaySettingsProps({
            temperatures: { outdoor: sensor({ status: 'disconnected', temperature_c: 31.4 }) },
          })}
        />,
      )
      await user.click(screen.getByText('Temperature'))
      const row = screen.getByTestId('temperature-sensor-outdoor')
      expect(row).toHaveTextContent('--°C')
      expect(row).not.toHaveTextContent('31')
    })

    it('publishes the chosen unit for that sensor only', async () => {
      const user = userEvent.setup()
      const onTemperatureUnitChange = vi.fn()
      render(
        <SettingsTab
          {...displaySettingsProps({
            temperatures: { outdoor: sensor(), indoor: sensor({ name: 'Indoor' }) },
            onTemperatureUnitChange,
          })}
        />,
      )
      await user.click(screen.getByText('Temperature'))
      await user.click(
        within(screen.getByTestId('temperature-sensor-outdoor')).getByRole('button', {
          name: '°F',
        }),
      )
      expect(onTemperatureUnitChange).toHaveBeenCalledExactlyOnceWith('outdoor', 'F')
    })

    it('commits a renamed sensor once, on Enter, trimmed -- not per keystroke', async () => {
      const user = userEvent.setup()
      const onTemperatureNameChange = vi.fn()
      render(
        <SettingsTab
          {...displaySettingsProps({
            temperatures: { outdoor: sensor() },
            onTemperatureNameChange,
          })}
        />,
      )
      await user.click(screen.getByText('Temperature'))
      const input = screen.getByLabelText('Name for outdoor')
      await user.clear(input)
      await user.type(input, '  Galley roof ')
      expect(onTemperatureNameChange).not.toHaveBeenCalled()
      await user.keyboard('{Enter}')
      expect(onTemperatureNameChange).toHaveBeenCalledExactlyOnceWith('outdoor', 'Galley roof')
    })

    it('reverts instead of publishing an empty, unchanged or cancelled name', async () => {
      const user = userEvent.setup()
      const onTemperatureNameChange = vi.fn()
      render(
        <SettingsTab
          {...displaySettingsProps({
            temperatures: { outdoor: sensor() },
            onTemperatureNameChange,
          })}
        />,
      )
      await user.click(screen.getByText('Temperature'))
      const input = screen.getByLabelText('Name for outdoor')

      await user.clear(input)
      await user.type(input, '   {Enter}')
      expect(input).toHaveValue('Outdoor')

      await user.clear(input)
      await user.type(input, 'Outdoor{Enter}')

      await user.clear(input)
      await user.type(input, 'Typo{Escape}')
      expect(input).toHaveValue('Outdoor')

      expect(onTemperatureNameChange).not.toHaveBeenCalled()
    })

    it('disables editing until the sensor has published its identity', async () => {
      const user = userEvent.setup()
      render(
        <SettingsTab {...displaySettingsProps({ temperatures: { outdoor: { status: 'ok' } } })} />,
      )
      await user.click(screen.getByText('Temperature'))
      expect(screen.getByLabelText('Name for outdoor')).toBeDisabled()
      expect(
        within(screen.getByTestId('temperature-sensor-outdoor')).getByRole('button', {
          name: '°F',
        }),
      ).toBeDisabled()
    })
  })
})
