import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ConnectionStatus, RouterHealth, TailscaleStatus } from '@/hooks/useRenewvanBus'
import type { Router } from '@/types'
import { UplinkStatusButton } from './UplinkStatusButton'

const connectedTailscale: TailscaleStatus = {
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

function setup(
  router: Partial<Router> | undefined,
  routerHealth: RouterHealth | null,
  ageMs: number | null = null,
  tailscale: TailscaleStatus = connectedTailscale,
  onOpenSettings: () => void = () => {},
  busStatus: ConnectionStatus = 'connected',
) {
  render(
    <UplinkStatusButton
      router={router}
      routerHealth={routerHealth}
      lastReceivedAt={ageMs === null ? undefined : Date.now() - ageMs}
      tailscale={tailscale}
      busStatus={busStatus}
      onOpenSettings={onOpenSettings}
    />,
  )
}

describe('UplinkStatusButton icon per tier', () => {
  it('shows a checking spinner before any router data arrives', () => {
    setup(undefined, null)
    const button = screen.getByTestId('uplink-status-button')
    expect(button).toHaveAttribute('aria-label', 'Checking connection…')
    expect(button).toHaveAttribute('data-state', 'checking')
  })

  it.each([
    [-85, 'bars-4', 'Connection: 4 of 4 bars'],
    [-90, 'bars-3', 'Connection: 3 of 4 bars'],
    [-100, 'bars-2', 'Connection: 2 of 4 bars'],
    [-110, 'bars-1', 'Connection: 1 of 4 bars'],
  ])('maps rsrp %d to its bar tier', (rsrp, state, label) => {
    setup({ ...liveRouter, signal_rsrp_dbm: rsrp }, 'online', 30_000)
    const button = screen.getByTestId('uplink-status-button')
    expect(button).toHaveAttribute('aria-label', label)
    expect(button).toHaveAttribute('data-state', state)
  })

  it('reads no-service below the signal floor while the node stays online', () => {
    setup({ ...liveRouter, signal_rsrp_dbm: -120 }, 'online', 30_000)
    const button = screen.getByTestId('uplink-status-button')
    expect(button).toHaveAttribute('aria-label', 'Connection: no service')
    expect(button).toHaveAttribute('data-state', 'no-service')
  })

  it('collapses to the reserved CloudOff glyph when the node health says offline', () => {
    setup(liveRouter, 'offline', 30_000)
    const button = screen.getByTestId('uplink-status-button')
    expect(button).toHaveAttribute('aria-label', 'Connection offline')
    expect(button).toHaveAttribute('data-state', 'offline')
  })

  it('goes offline on stale data even with a good signal and healthy node', () => {
    setup(liveRouter, 'online', 200_000)
    const button = screen.getByTestId('uplink-status-button')
    expect(button).toHaveAttribute('aria-label', 'Connection offline')
    expect(button).toHaveAttribute('data-state', 'offline')
  })
})

describe('UplinkStatusButton popover', () => {
  it('shows network, operator, RSRP, and monthly data, plus the Tailscale row', async () => {
    const user = userEvent.setup()
    setup(liveRouter, 'online', 30_000)
    await user.click(screen.getByRole('button', { name: 'Connection: 4 of 4 bars' }))

    expect(await screen.findByText('LTE · O2')).toBeInTheDocument()
    expect(screen.getByText('RSRP')).toBeInTheDocument()
    expect(screen.getByText('-85 dBm')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText(/↓ 385\.1 MB · ↑ 140\.2 MB/)).toBeInTheDocument()
    expect(screen.getByText('Tailscale')).toBeInTheDocument()
    expect(screen.getByText('100.64.0.1')).toBeInTheDocument()
  })

  it('carries the bus-link state as a dot row merged in from RouterStatusIcon', async () => {
    const user = userEvent.setup()
    setup(liveRouter, 'online', 30_000, connectedTailscale, () => {}, 'disconnected')
    await user.click(screen.getByRole('button', { name: 'Connection: 4 of 4 bars' }))

    expect(await screen.findByText('Hub')).toBeInTheDocument()
    expect(screen.getByText('Down — showing last-known state')).toBeInTheDocument()
  })

  it("renders em-dashes, not hidden rows, for fields a partial entity hasn't sent", async () => {
    const user = userEvent.setup()
    setup({ signal_rsrp_dbm: -85 }, 'online', 30_000, {
      enabled: false,
      connected: false,
      ip: null,
      hostname: null,
      peers: 0,
    })
    await user.click(screen.getByRole('button', { name: 'Connection: 4 of 4 bars' }))

    expect(await screen.findByText('UNKNOWN · —')).toBeInTheDocument()
    expect(screen.getByText('-85 dBm')).toBeInTheDocument()
    expect(screen.getByText('Data')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.getByText('Tailscale')).toBeInTheDocument()
    expect(screen.getByText('Not installed')).toBeInTheDocument()
  })

  it('checks instead of guessing while nothing has arrived', async () => {
    const user = userEvent.setup()
    setup(undefined, null)
    await user.click(screen.getByRole('button', { name: 'Checking connection…' }))

    expect(await screen.findByText('Checking…')).toBeInTheDocument()
    expect(screen.queryByText('RSRP')).not.toBeInTheDocument()
    expect(screen.getByText('Tailscale')).toBeInTheDocument()
  })

  it('drops the detail rows when offline but keeps the Tailscale row', async () => {
    const user = userEvent.setup()
    setup(liveRouter, 'offline', 30_000)
    await user.click(screen.getByRole('button', { name: 'Connection offline' }))

    expect(await screen.findByText('Offline')).toBeInTheDocument()
    expect(screen.queryByText('RSRP')).not.toBeInTheDocument()
    expect(screen.queryByText('Data')).not.toBeInTheDocument()
    expect(screen.getByText('Tailscale')).toBeInTheDocument()
  })

  it('navigates to settings from the popover footer and closes it', async () => {
    const user = userEvent.setup()
    const onOpenSettings = vi.fn()
    setup(liveRouter, 'online', 30_000, connectedTailscale, onOpenSettings)
    await user.click(screen.getByRole('button', { name: 'Connection: 4 of 4 bars' }))

    await user.click(await screen.findByRole('button', { name: 'Network settings' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('LTE · O2')).not.toBeInTheDocument()
  })
})
