import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsTab, type SettingsTabProps } from './SettingsTab'

const connectedTailscale = { enabled: true, connected: true, ip: '100.64.0.1', hostname: 'renewvan', peers: 1 }

function displaySettingsProps(overrides: Partial<SettingsTabProps> = {}): SettingsTabProps {
  return {
    tailscale: connectedTailscale,
    brightness: 70,
    autoSleepEnabled: false,
    autoSleepTimeoutMinutes: 5,
    onBrightnessChange: vi.fn(),
    onAutoSleepEnabledChange: vi.fn(),
    onAutoSleepTimeoutMinutesChange: vi.fn(),
    portalContainer: null,
    active: true,
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

  it('shows loading state when tailscale is null', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps({ tailscale: null })} />)
    await user.click(screen.getByText('Network'))
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/loading/i)
  })

  it('shows not authenticated when enabled but not connected', async () => {
    const user = userEvent.setup()
    render(<SettingsTab {...displaySettingsProps({ tailscale: { ...connectedTailscale, connected: false } })} />)
    await user.click(screen.getByText('Network'))
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/not authenticated/i)
  })

  it('shows not installed when tailscale is not enabled', async () => {
    const user = userEvent.setup()
    render(
      <SettingsTab {...displaySettingsProps({ tailscale: { ...connectedTailscale, connected: false, enabled: false } })} />,
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
    const { container } = render(<SettingsTab {...displaySettingsProps({ brightness: 42, onBrightnessChange })} />)
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
      <SettingsTab {...displaySettingsProps({ autoSleepEnabled: true, autoSleepTimeoutMinutes: 5, onAutoSleepTimeoutMinutesChange })} />,
    )
    await user.click(screen.getByText('Display'))
    await user.click(screen.getByText('15m'))
    expect(onAutoSleepTimeoutMinutesChange).toHaveBeenCalledWith(15)
  })
})
