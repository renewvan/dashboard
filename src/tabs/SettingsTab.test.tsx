import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsTab } from './SettingsTab'

const connectedTailscale = { enabled: true, connected: true, ip: '100.64.0.1', hostname: 'renewvan', peers: 1 }

describe('SettingsTab', () => {
  it('renders the sleep button', () => {
    render(<SettingsTab onSleep={() => {}} tailscale={null} />)
    expect(screen.getByTestId('sleep-button')).toBeInTheDocument()
  })

  it('calls onSleep when the sleep button is clicked', async () => {
    const onSleep = vi.fn()
    render(<SettingsTab onSleep={onSleep} tailscale={null} />)
    await userEvent.click(screen.getByTestId('sleep-button'))
    expect(onSleep).toHaveBeenCalledTimes(1)
  })
  it('shows loading state when tailscale is null', () => {
    render(<SettingsTab onSleep={() => {}} tailscale={null} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('loading')
  })

  it('shows Tailscale IP when connected', () => {
    render(<SettingsTab onSleep={() => {}} tailscale={connectedTailscale} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('100.64.0.1')
  })

  it('shows not authenticated when enabled but not connected', () => {
    render(<SettingsTab onSleep={() => {}} tailscale={{ ...connectedTailscale, connected: false, ip: null, hostname: null }} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('not authenticated')
  })
})
