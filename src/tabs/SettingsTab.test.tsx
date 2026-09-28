import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsTab } from './SettingsTab'

const connectedTailscale = { enabled: true, connected: true, ip: '100.64.0.1', hostname: 'renewvan', peers: 1 }

describe('SettingsTab', () => {
  it('renders the Display title and its toggle', () => {
    render(<SettingsTab displayPower="on" onSleep={() => {}} onWake={() => {}} tailscale={null} />)
    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.getByTestId('display-power-toggle')).toBeInTheDocument()
  })

  it('shows the toggle checked when the display is on', () => {
    render(<SettingsTab displayPower="on" onSleep={() => {}} onWake={() => {}} tailscale={null} />)
    expect(screen.getByTestId('display-power-toggle')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the toggle unchecked when the display is off', () => {
    render(<SettingsTab displayPower="off" onSleep={() => {}} onWake={() => {}} tailscale={null} />)
    expect(screen.getByTestId('display-power-toggle')).toHaveAttribute('aria-checked', 'false')
  })

  it('disables the toggle until the retained display-power topic arrives', () => {
    render(<SettingsTab displayPower={null} onSleep={() => {}} onWake={() => {}} tailscale={null} />)
    expect(screen.getByTestId('display-power-toggle')).toHaveAttribute('aria-disabled', 'true')
  })

  it('calls onSleep when switched off', async () => {
    const onSleep = vi.fn()
    render(<SettingsTab displayPower="on" onSleep={onSleep} onWake={() => {}} tailscale={null} />)
    await userEvent.click(screen.getByTestId('display-power-toggle'))
    expect(onSleep).toHaveBeenCalledTimes(1)
  })

  it('calls onWake when switched on', async () => {
    const onWake = vi.fn()
    render(<SettingsTab displayPower="off" onSleep={() => {}} onWake={onWake} tailscale={null} />)
    await userEvent.click(screen.getByTestId('display-power-toggle'))
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('shows loading state when tailscale is null', () => {
    render(<SettingsTab displayPower="on" onSleep={() => {}} onWake={() => {}} tailscale={null} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('Loading')
  })

  it('shows Tailscale IP when connected', () => {
    render(<SettingsTab displayPower="on" onSleep={() => {}} onWake={() => {}} tailscale={connectedTailscale} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('100.64.0.1')
  })

  it('shows not authenticated when enabled but not connected', () => {
    render(
      <SettingsTab
        displayPower="on"
        onSleep={() => {}}
        onWake={() => {}}
        tailscale={{ ...connectedTailscale, connected: false, ip: null, hostname: null }}
      />,
    )
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('Not authenticated')
  })
})
