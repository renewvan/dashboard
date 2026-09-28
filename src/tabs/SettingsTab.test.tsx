import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SettingsTab, type SettingsTabProps } from './SettingsTab'

const connectedTailscale = { enabled: true, connected: true, ip: '100.64.0.1', hostname: 'renewvan', peers: 1 }

const baseProps: SettingsTabProps = {
  displayPower: 'on',
  onSleep: vi.fn(),
  onWake: vi.fn(),
  tailscale: null,
  theme: 'dark',
  onThemeChange: vi.fn(),
}

describe('SettingsTab', () => {
  it('renders the Display title and its toggle', () => {
    render(<SettingsTab {...baseProps} />)
    expect(screen.getByText('Display')).toBeInTheDocument()
    expect(screen.getByTestId('display-power-toggle')).toBeInTheDocument()
  })

  it('shows the toggle checked when the display is on', () => {
    render(<SettingsTab {...baseProps} displayPower="on" />)
    expect(screen.getByTestId('display-power-toggle')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the toggle unchecked when the display is off', () => {
    render(<SettingsTab {...baseProps} displayPower="off" />)
    expect(screen.getByTestId('display-power-toggle')).toHaveAttribute('aria-checked', 'false')
  })

  it('disables the toggle until the retained display-power topic arrives', () => {
    render(<SettingsTab {...baseProps} displayPower={null} />)
    expect(screen.getByTestId('display-power-toggle')).toHaveAttribute('aria-disabled', 'true')
  })

  it('calls onSleep when switched off', async () => {
    const onSleep = vi.fn()
    render(<SettingsTab {...baseProps} displayPower="on" onSleep={onSleep} />)
    await userEvent.click(screen.getByTestId('display-power-toggle'))
    expect(onSleep).toHaveBeenCalledTimes(1)
  })

  it('calls onWake when switched on', async () => {
    const onWake = vi.fn()
    render(<SettingsTab {...baseProps} displayPower="off" onWake={onWake} />)
    await userEvent.click(screen.getByTestId('display-power-toggle'))
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('toggles when the row label is clicked, not just the switch (fat-fingers/gloves target)', async () => {
    const onWake = vi.fn()
    render(<SettingsTab {...baseProps} displayPower="off" onWake={onWake} />)
    await userEvent.click(screen.getByText('Display'))
    expect(onWake).toHaveBeenCalledTimes(1)
  })

  it('shows the dark theme toggle checked in dark theme', () => {
    render(<SettingsTab {...baseProps} theme="dark" />)
    expect(screen.getByTestId('dark-theme-toggle')).toHaveAttribute('aria-checked', 'true')
  })

  it('shows the dark theme toggle unchecked in light theme', () => {
    render(<SettingsTab {...baseProps} theme="light" />)
    expect(screen.getByTestId('dark-theme-toggle')).toHaveAttribute('aria-checked', 'false')
  })

  it('calls onThemeChange with dark when switched on', async () => {
    const onThemeChange = vi.fn()
    render(<SettingsTab {...baseProps} theme="light" onThemeChange={onThemeChange} />)
    await userEvent.click(screen.getByTestId('dark-theme-toggle'))
    expect(onThemeChange).toHaveBeenCalledWith('dark')
  })

  it('calls onThemeChange with light when switched off', async () => {
    const onThemeChange = vi.fn()
    render(<SettingsTab {...baseProps} theme="dark" onThemeChange={onThemeChange} />)
    await userEvent.click(screen.getByTestId('dark-theme-toggle'))
    expect(onThemeChange).toHaveBeenCalledWith('light')
  })

  it('shows loading state when tailscale is null', () => {
    render(<SettingsTab {...baseProps} tailscale={null} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('Loading')
  })

  it('shows Tailscale IP when connected', () => {
    render(<SettingsTab {...baseProps} tailscale={connectedTailscale} />)
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('100.64.0.1')
  })

  it('shows not authenticated when enabled but not connected', () => {
    render(
      <SettingsTab
        {...baseProps}
        tailscale={{ ...connectedTailscale, connected: false, ip: null, hostname: null }}
      />,
    )
    expect(screen.getByTestId('tailscale-status')).toHaveTextContent('Not authenticated')
  })
})
