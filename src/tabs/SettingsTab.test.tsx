import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SettingsTab } from './SettingsTab'

const connectedTailscale = { enabled: true, connected: true, ip: '100.64.0.1', hostname: 'renewvan', peers: 1 }

describe('SettingsTab', () => {
  it('shows loading state when tailscale is null', () => {
    render(<SettingsTab tailscale={null} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/loading/i)
  })

  it('shows Tailscale IP when connected', () => {
    render(<SettingsTab tailscale={connectedTailscale} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('100.64.0.1')
  })

  it('shows not authenticated when enabled but not connected', () => {
    render(<SettingsTab tailscale={{ ...connectedTailscale, connected: false }} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/not authenticated/i)
  })

  it('shows not installed when tailscale is not enabled', () => {
    render(<SettingsTab tailscale={{ ...connectedTailscale, connected: false, enabled: false }} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent(/not installed/i)
  })
})
