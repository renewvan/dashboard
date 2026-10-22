import { act, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import {
  ROUTER_DEVICES,
  connectedTailscale,
  liveRouter,
  renderSettings,
  settingsRows,
} from '@/test/renderSettings'

afterEach(() => {
  vi.useRealTimers()
})

/** Rows of the read-only page as `[label, value]`, in display order. */
function detailRows() {
  const labels = screen.getAllByRole('term').map((term) => term.textContent)
  const values = screen.getAllByRole('definition').map((value) => value.textContent)
  return labels.map((label, i) => [label, values[i]])
}

/** Rows of one labelled block of the page, so a test about the Device does not read the radio's. */
function blockRows(label: string) {
  const block = within(screen.getByLabelText(label))
  const labels = block.getAllByRole('term').map((term) => term.textContent)
  const values = block.getAllByRole('definition').map((value) => value.textContent)
  return labels.map((name, i) => [name, values[i]])
}

async function open(
  user: ReturnType<typeof renderSettings>['user'],
  ...labels: [string, ...string[]]
) {
  for (const label of labels) {
    await user.click(screen.getByRole('button', { name: new RegExp(`^${label}`) }))
  }
}

describe('Connectivity', () => {
  it('lists exactly the router, Hub and Tailscale with live summaries', async () => {
    const { user } = renderSettings()

    await open(user, 'Connectivity')

    const rows = settingsRows().map((row) => row.textContent)
    expect(rows).toEqual(['RouterLTE · O2', 'HubConnected', `Tailscale${connectedTailscale.ip}`])
  })

  it.each([
    ['connecting', 'Connecting…'],
    ['disconnected', 'Down — showing last-known state'],
  ] as const)('summarises a %s Bus link as "%s"', async (busStatus, text) => {
    const { user } = renderSettings({ busStatus })

    await open(user, 'Connectivity')

    expect(screen.getByRole('button', { name: /^Hub/ })).toHaveTextContent(text)
  })

  it('summarises the router row as Checking while its Device is up but no data has arrived', async () => {
    const { user } = renderSettings(
      { router: undefined, routerUpdatedAt: undefined },
      { bus: { devices: ROUTER_DEVICES } },
    )

    await open(user, 'Connectivity')

    expect(screen.getByRole('button', { name: /^RUT-360/ })).toHaveTextContent('Checking…')
  })

  it('degrades the router summary to Offline when the router feed goes stale', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderSettings({ routerUpdatedAt: Date.now() })
    await open(user, 'Connectivity')
    expect(screen.getByRole('button', { name: /^Router/ })).toHaveTextContent('LTE · O2')

    // No new router data, no other re-render trigger: only the clock moves.
    act(() => {
      vi.advanceTimersByTime(210_000)
    })

    expect(screen.getByRole('button', { name: /^Router/ })).toHaveTextContent('Offline')
  })
})

describe('Router page', () => {
  it('lists every router field with its unit and formatting', async () => {
    const { user } = renderSettings({ router: liveRouter })

    await open(user, 'Connectivity', 'Router')

    expect(detailRows()).toEqual([
      ['Operator', 'O2'],
      ['Network', 'LTE'],
      ['RSRP', '-85 dBm'],
      ['RSRQ', '-10 dB'],
      ['SINR', '6 dB'],
      ['RSSI', '-54 dBm'],
      ['Uptime', '9d 13h'],
      ['Data this month', '↓ 385.1 MB · ↑ 140.2 MB'],
    ])
  })

  it('shows an operator it cannot name as its raw code', async () => {
    const { user } = renderSettings({ router: { ...liveRouter, operator: '99999' } })

    await open(user, 'Connectivity', 'Router')

    expect(detailRows()[0]).toEqual(['Operator', '99999'])
  })

  it('shows a dash for each field not yet received, keeping every row', async () => {
    const { user } = renderSettings({ router: { signal_rsrp_dbm: -85 } })

    await open(user, 'Connectivity', 'Router')

    expect(detailRows()).toEqual([
      ['Operator', '—'],
      ['Network', '—'],
      ['RSRP', '-85 dBm'],
      ['RSRQ', '—'],
      ['SINR', '—'],
      ['RSSI', '—'],
      ['Uptime', '—'],
      ['Data this month', '—'],
    ])
  })

  it('shows a dash for data until both directions have been received', async () => {
    const { user } = renderSettings({
      router: { data_used_month_rx_b: liveRouter.data_used_month_rx_b },
    })

    await open(user, 'Connectivity', 'Router')

    expect(detailRows().at(-1)).toEqual(['Data this month', '—'])
  })

  it('shows dashes for every field before any router has reported', async () => {
    const { user } = renderSettings({ router: undefined })

    await open(user, 'Connectivity', 'Router')

    const rows = detailRows()
    expect(rows).toHaveLength(8)
    expect(rows.every(([, value]) => value === '—')).toBe(true)
  })
})

describe('Router with its driver installed', () => {
  const installed = { bus: { devices: ROUTER_DEVICES } }

  it('is named for the router model the driver reports, in the list and as the page title', async () => {
    const { user } = renderSettings({}, installed)

    await open(user, 'Connectivity')
    expect(settingsRows().map((row) => row.textContent)).toEqual([
      'RUT-360LTE · O2',
      'HubConnected',
      `Tailscale${connectedTailscale.ip}`,
    ])

    await open(user, 'RUT-360')
    expect(screen.getByRole('heading', { name: 'RUT-360' })).toBeInTheDocument()
  })

  it('shows the driver itself above the radio readings: product, status and firmware', async () => {
    const { user } = renderSettings({}, installed)

    await open(user, 'Connectivity', 'RUT-360')

    expect(blockRows('Router device')).toEqual([
      ['Product', 'Teltonika RUT-360 router'],
      ['Status', 'Online'],
      ['Firmware', 'v0.2.0'],
    ])
  })

  it('says offline, last seen, while the driver is down, and keeps the radio readings', async () => {
    const { user } = renderSettings(
      {},
      { bus: { devices: { router: { ...ROUTER_DEVICES.router, health: 'offline' } } } },
    )

    await open(user, 'Connectivity', 'RUT-360')

    expect(blockRows('Router device')).toEqual([
      ['Product', 'Teltonika RUT-360 router'],
      ['Status', 'Offline'],
      ['Firmware', 'offline, last seen v0.2.0'],
    ])
    expect(blockRows('RUT-360')[0]).toEqual(['Operator', 'O2'])
  })

  it('reads 5G for an NR network, as the header icon does', async () => {
    const { user } = renderSettings({ router: { ...liveRouter, network_type: 'nr' } }, installed)

    await open(user, 'Connectivity', 'RUT-360')

    expect(blockRows('RUT-360')[1]).toEqual(['Network', '5G'])
  })
})

describe('Router with no driver installed', () => {
  const none = { router: undefined, routerUpdatedAt: undefined }

  it('says Not installed, not Checking for ever, when nothing publishes a router', async () => {
    const { user } = renderSettings(none)

    await open(user, 'Connectivity')

    expect(screen.getByRole('button', { name: /^Router/ })).toHaveTextContent('Not installed')
  })

  it('shows no Device block on the router page, only the readings as dashes', async () => {
    const { user } = renderSettings(none)

    await open(user, 'Connectivity', 'Router')

    expect(screen.queryByLabelText('Router device')).not.toBeInTheDocument()
    expect(detailRows()).toHaveLength(8)
  })

  it('still shows live router data that has no Device behind it, never hiding numbers', async () => {
    const { user } = renderSettings({ router: liveRouter, routerUpdatedAt: Date.now() })

    await open(user, 'Connectivity')

    expect(screen.getByRole('button', { name: /^Router/ })).toHaveTextContent('LTE · O2')
  })
})

describe('Hub', () => {
  it.each([
    ['connected', 'Connected'],
    ['connecting', 'Connecting…'],
    ['disconnected', 'Down — showing last-known state'],
  ] as const)('shows a %s Bus link as "%s"', async (busStatus, text) => {
    const { user } = renderSettings({ busStatus })

    await open(user, 'Connectivity', 'Hub')

    expect(detailRows()).toEqual([['Bus link', text]])
  })
})

describe('Tailscale', () => {
  it.each([
    ['connected', connectedTailscale, '100.64.0.1'],
    ['still loading', null, 'Loading…'],
    ['not authenticated', { ...connectedTailscale, connected: false }, 'Not authenticated'],
    ['not installed', { ...connectedTailscale, connected: false, enabled: false }, 'Not installed'],
  ])('shows %s as "%s"', async (_state, tailscale, text) => {
    const { user } = renderSettings({ tailscale })

    await open(user, 'Connectivity', 'Tailscale')

    expect(detailRows()).toEqual([['Status', text]])
  })
})

describe('Connectivity navigation bar', () => {
  it('walks up one level at a time from a depth-2 page', async () => {
    const { user } = renderSettings()
    await open(user, 'Connectivity', 'Router')

    expect(screen.getByRole('heading', { name: 'Router' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Connectivity' }))
    expect(screen.getByRole('heading', { name: 'Connectivity' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Router/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
