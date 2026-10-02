import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { TailscaleStatus, UplinkStatus } from '../hooks/useRenewvanBus'
import { UplinkStatusButton } from './UplinkStatusButton'

const connectedTailscale: TailscaleStatus = {
  enabled: true,
  connected: true,
  ip: '100.64.0.1',
  hostname: 'renewvan',
  peers: 1,
}

const wifiOnline: UplinkStatus = {
  path: 'wifi',
  online: true,
  ssid: 'VanNet',
  interface: 'wlan0',
  ip: '192.168.1.42',
}
const lanOnline: UplinkStatus = { ...wifiOnline, path: 'lan', ssid: null }
const tailscaleOnly: UplinkStatus = {
  path: 'none',
  online: true,
  ssid: null,
  interface: null,
  ip: null,
}
const offline: UplinkStatus = { ...lanOnline, online: false }

function iconClassOf(container: HTMLElement): string | null {
  return container.querySelector<SVGSVGElement>('svg')?.getAttribute('class') ?? null
}

describe('UplinkStatusButton icon per state', () => {
  it('shows a checking spinner before the first message arrives', () => {
    const { container } = render(
      <UplinkStatusButton uplink={null} tailscale={null} onOpenSettings={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Checking uplink…' })).toBeInTheDocument()
    expect(iconClassOf(container)).toContain('lucide-loader-circle')
    expect(screen.getByTestId('uplink-status-button')).toHaveAttribute('data-state', 'checking')
  })

  it('shows the wired glyph for LAN online', () => {
    const { container } = render(
      <UplinkStatusButton uplink={lanOnline} tailscale={null} onOpenSettings={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Uplink via LAN' })).toBeInTheDocument()
    expect(iconClassOf(container)).toContain('lucide-chevrons-left-right-ellipsis')
    expect(screen.getByTestId('uplink-status-button')).toHaveAttribute('data-state', 'online')
  })

  it('shows the wifi glyph, label including the SSID', () => {
    const { container } = render(
      <UplinkStatusButton uplink={wifiOnline} tailscale={null} onOpenSettings={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Uplink via WiFi (VanNet)' })).toBeInTheDocument()
    expect(iconClassOf(container)).toContain('lucide-wifi')
  })

  it('shows the tunnel glyph for Tailscale-only online', () => {
    const { container } = render(
      <UplinkStatusButton
        uplink={tailscaleOnly}
        tailscale={connectedTailscale}
        onOpenSettings={() => {}}
      />,
    )
    expect(screen.getByRole('button', { name: 'Uplink via Tailscale' })).toBeInTheDocument()
    expect(iconClassOf(container)).toContain('lucide-shield-lock')
  })

  it('collapses every offline path to the reserved CloudOff glyph', () => {
    const { container } = render(
      <UplinkStatusButton uplink={offline} tailscale={null} onOpenSettings={() => {}} />,
    )
    expect(screen.getByRole('button', { name: 'Uplink offline' })).toBeInTheDocument()
    expect(iconClassOf(container)).toContain('lucide-cloud-off')
    expect(screen.getByTestId('uplink-status-button')).toHaveAttribute('data-state', 'offline')
  })
})

describe('UplinkStatusButton popover', () => {
  it('shows wifi detail and online-only diagnostic fields, plus the Tailscale row', async () => {
    const user = userEvent.setup()
    render(
      <UplinkStatusButton
        uplink={wifiOnline}
        tailscale={connectedTailscale}
        onOpenSettings={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Uplink via WiFi (VanNet)' }))

    expect(await screen.findByText('Online')).toBeInTheDocument()
    expect(screen.getByText('Wi-Fi network')).toBeInTheDocument()
    expect(screen.getByText('VanNet')).toBeInTheDocument()
    expect(screen.getByText('Interface')).toBeInTheDocument()
    expect(screen.getByText('192.168.1.42')).toBeInTheDocument()
    expect(screen.getByText('Tailscale')).toBeInTheDocument()
    expect(screen.getByText('100.64.0.1')).toBeInTheDocument()
  })

  it('omits diagnostic fields when offline but keeps the Tailscale row', async () => {
    const user = userEvent.setup()
    render(
      <UplinkStatusButton
        uplink={offline}
        tailscale={{ enabled: false, connected: false, ip: null, hostname: null, peers: 0 }}
        onOpenSettings={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Uplink offline' }))

    expect(await screen.findByText('Offline')).toBeInTheDocument()
    expect(screen.queryByText('Interface')).not.toBeInTheDocument()
    expect(screen.queryByText('Local IP')).not.toBeInTheDocument()
    expect(screen.getByText('Tailscale')).toBeInTheDocument()
    expect(screen.getByText('Not installed')).toBeInTheDocument()
  })

  it('renders a dash for a null field while online, instead of hiding the row', async () => {
    const user = userEvent.setup()
    render(
      <UplinkStatusButton
        uplink={{ ...wifiOnline, ip: null, interface: null }}
        tailscale={null}
        onOpenSettings={() => {}}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Uplink via WiFi (VanNet)' }))

    expect(await screen.findAllByText('—')).toHaveLength(2)
  })

  it('opens settings via the popover footer action', async () => {
    const onOpenSettings = vi.fn()
    const user = userEvent.setup()
    render(
      <UplinkStatusButton uplink={lanOnline} tailscale={null} onOpenSettings={onOpenSettings} />,
    )
    await user.click(screen.getByRole('button', { name: 'Uplink via LAN' }))
    await user.click(await screen.findByRole('button', { name: /open settings/i }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })
})
