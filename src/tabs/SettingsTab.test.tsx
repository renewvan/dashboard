import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Router, TemperatureSensor } from '@/types'
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
  const temperatures = overrides.temperatures ?? {}
  const sensorCount = Object.keys(temperatures).length
  return {
    tailscale: connectedTailscale,
    brightness: 70,
    autoSleepEnabled: false,
    autoSleepTimeoutMinutes: 5,
    onBrightnessChange: vi.fn(),
    onAutoSleepEnabledChange: vi.fn(),
    onAutoSleepTimeoutMinutesChange: vi.fn(),
    temperatures,
    // A bus that has sensors has published the temperature node — keep the
    // two in step unless a test overrides `nodes` explicitly.
    nodes:
      sensorCount > 0 ? [{ domain: 'temperatures', label: 'Temperature', count: sensorCount }] : [],
    alertsEnabled: true,
    onAlertsEnabledChange: vi.fn(),
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

/** Drill down the Settings tree by tapping each label in turn. */
async function openPath(user: UserEvent, ...labels: string[]) {
  for (const label of labels) await user.click(screen.getByText(label))
}

beforeEach(() => {
  window.localStorage.clear()
})

describe('SettingsTab', () => {
  it('lists exactly Nodes, General and Connectivity at the top level', () => {
    render(<SettingsTab {...displaySettingsProps()} />)
    expect(screen.getByText('Nodes')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Connectivity')).toBeInTheDocument()
    expect(screen.queryByText('Display')).not.toBeInTheDocument()
    expect(screen.queryByText('Network')).not.toBeInTheDocument()
    expect(screen.queryByTestId('tailscale-status')).not.toBeInTheDocument()
  })

  it('General lists Access control, Alerts, Display, Firmware and Support', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'General')
    for (const label of ['Access control', 'Alerts', 'Display', 'Firmware', 'Support']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('Alerts toggle reflects the preference and reports changes', async () => {
    const user = userEvent.setup()
    const onAlertsEnabledChange = vi.fn()
    render(
      <SettingsTab {...displaySettingsProps({ alertsEnabled: true, onAlertsEnabledChange })} />,
    )
    await openPath(user, 'General')
    expect(screen.getByText('Notifications on')).toBeInTheDocument()

    await user.click(screen.getByText('Alerts'))
    const toggle = screen.getByRole('switch', { name: 'Show alert notifications' })
    expect(toggle).toBeChecked()

    await user.click(toggle)
    expect(onAlertsEnabledChange).toHaveBeenCalledExactlyOnceWith(false)
  })

  it('Alerts row says notifications are off when disabled', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps({ alertsEnabled: false })} />)
    await openPath(user, 'General')
    expect(screen.getByText('Notifications off')).toBeInTheDocument()
  })

  it('Connectivity lists Ethernet, Wi-Fi, Bluetooth, Hub and Tailscale', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'Connectivity')
    for (const label of ['Ethernet', 'Wi-Fi', 'Bluetooth', 'Hub', 'Tailscale']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('leaves without a backing node say so instead of rendering controls', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'Connectivity', 'Bluetooth')
    expect(screen.getByTestId('not-available')).toHaveTextContent('Bluetooth is not available yet')
  })

  it('Nodes lists every node that has published, with its entity count', async () => {
    const user = userEvent.setup()
    render(
      <SettingsTab
        {...displaySettingsProps({
          nodes: [
            { domain: 'tanks', label: 'Tanks', count: 3 },
            { domain: 'gps', label: 'GPS', count: 1 },
          ],
        })}
      />,
    )
    expect(screen.getByText('2 nodes')).toBeInTheDocument()
    await openPath(user, 'Nodes')
    expect(screen.getByTestId('node-tanks')).toHaveTextContent('3 entities')
    expect(screen.getByTestId('node-gps')).toHaveTextContent('1 entity')
  })

  it('Nodes says so before any node has published', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps({ nodes: [] })} />)
    await openPath(user, 'Nodes')
    expect(screen.getByTestId('no-nodes')).toBeInTheDocument()
  })

  it('Hub subpage shows the bus link state', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'Connectivity', 'Hub')
    expect(screen.getByTestId('bus-status')).toHaveTextContent('Connected')
  })

  it('Cellular subpage lists every router field', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'Connectivity', 'Cellular')

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
    await openPath(user, 'Connectivity', 'Cellular')

    expect(screen.getByText('-85 dBm')).toBeInTheDocument()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('deep-links straight into Connectivity → Cellular via focusView', () => {
    render(<SettingsTab {...displaySettingsProps({ focusView: 'connectivity' })} />)
    expect(screen.getByText('Operator')).toBeInTheDocument()
    expect(screen.getByText('RSRP')).toBeInTheDocument()
  })

  it('reports focusView as consumed so a repeat CTA tap re-triggers the jump', () => {
    // App clears focusView once fired; without the callback a second tap
    // with the same value would be a no-op and dead-end on the list.
    const onFocusConsumed = vi.fn()
    const { rerender } = render(
      <SettingsTab {...displaySettingsProps({ focusView: 'connectivity', onFocusConsumed })} />,
    )
    expect(onFocusConsumed).toHaveBeenCalledTimes(1)
    expect(screen.getByText('RSRP')).toBeInTheDocument()

    // Consumed (App cleared it): stays put, does not re-fire.
    rerender(<SettingsTab {...displaySettingsProps({ onFocusConsumed })} />)
    expect(onFocusConsumed).toHaveBeenCalledTimes(1)
    expect(screen.getByText('RSRP')).toBeInTheDocument()
  })

  it('plain sidebar entry still lands on the list when focusView is unset', () => {
    render(<SettingsTab {...displaySettingsProps()} />)
    expect(screen.getByText('Connectivity')).toBeInTheDocument()
    expect(screen.queryByText('RSRP')).not.toBeInTheDocument()
  })

  it('shows loading state when tailscale is null', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps({ tailscale: null })} />)
    await openPath(user, 'Connectivity', 'Tailscale')
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/loading/i)
  })

  it('shows not authenticated when enabled but not connected', async () => {
    const user = userEvent.setup()
    render(
      <SettingsTab
        {...displaySettingsProps({ tailscale: { ...connectedTailscale, connected: false } })}
      />,
    )
    await openPath(user, 'Connectivity', 'Tailscale')
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
    await openPath(user, 'Connectivity', 'Tailscale')
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/not installed/i)
  })

  it('breadcrumb walks back up one level at a time', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'General', 'Display')
    expect(screen.getByText('Brightness')).toBeInTheDocument()

    await user.click(screen.getByText('General'))
    expect(screen.getByText('Firmware')).toBeInTheDocument()
    expect(screen.queryByText('Brightness')).not.toBeInTheDocument()

    await user.click(screen.getByText('Settings'))
    expect(screen.getByText('Connectivity')).toBeInTheDocument()
    expect(screen.queryByText('Firmware')).not.toBeInTheDocument()
  })

  it('resets to the top-level list when the sidebar navigates away and back', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'General', 'Display')
    expect(screen.getByText('Brightness')).toBeInTheDocument()

    // Base UI's Tabs.Panel keeps this component mounted while another
    // sidebar tab is selected (only `active` flips), so a stale drill-down
    // `view` would otherwise survive the round trip.
    rerender(<SettingsTab {...displaySettingsProps({ active: false })} />)
    rerender(<SettingsTab {...displaySettingsProps({ active: true })} />)

    expect(screen.queryByText('Brightness')).not.toBeInTheDocument()
    expect(screen.getByText('Nodes')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
    expect(screen.getByText('Connectivity')).toBeInTheDocument()
  })

  it('switching to sheet navigation opens Display in a dialog', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps()} />)
    await openPath(user, 'General', 'Display', 'Navigation style')
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
    await openPath(user, 'General', 'Display', 'Navigation style')
    await user.click(screen.getByText('Sheets'))
    unmount()
    render(<SettingsTab {...displaySettingsProps()} />)
    await user.click(screen.getByText('General'))
    await user.click(screen.getByText('Display'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('reflects the bus-backed brightness value and calls onBrightnessChange on drag', async () => {
    const onBrightnessChange = vi.fn()
    const user = userEvent.setup()
    const { container } = render(
      <SettingsTab {...displaySettingsProps({ brightness: 42, onBrightnessChange })} />,
    )
    await openPath(user, 'General', 'Display')
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
    await openPath(user, 'General', 'Display')
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
    await openPath(user, 'General', 'Display')
    await user.click(screen.getByText('15m'))
    expect(onAutoSleepTimeoutMinutesChange).toHaveBeenCalledWith(15)
  })

  describe('Temperature node', () => {
    const sensor = (over: Partial<TemperatureSensor> = {}): TemperatureSensor => ({
      name: 'Outdoor',
      unit: 'C',
      source: 'w1',
      serial: '28-000000259026',
      temperature_c: 31.4,
      status: 'ok',
      ...over,
    })

    it('summarises the sensor count on its row under Nodes', async () => {
      const user = userEvent.setup()
      render(
        <SettingsTab
          {...displaySettingsProps({ temperatures: { outdoor: sensor(), indoor: sensor() } })}
        />,
      )
      await openPath(user, 'Nodes')
      expect(screen.getByText('Temperature')).toBeInTheDocument()
      expect(screen.getByText('2 sensors')).toBeInTheDocument()
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
      await openPath(user, 'Nodes', 'Temperature')
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
      await openPath(user, 'Nodes', 'Temperature')
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
      await openPath(user, 'Nodes', 'Temperature')
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
      await openPath(user, 'Nodes', 'Temperature')
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
      await openPath(user, 'Nodes', 'Temperature')
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
      await openPath(user, 'Nodes', 'Temperature')
      expect(screen.getByLabelText('Name for outdoor')).toBeDisabled()
      expect(
        within(screen.getByTestId('temperature-sensor-outdoor')).getByRole('button', {
          name: '°F',
        }),
      ).toBeDisabled()
    })
  })
})
