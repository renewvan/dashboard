import { act, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { connectedTailscale, liveRouter, renderSettings, settingsRows } from '@/test/renderSettings'

afterEach(() => {
  vi.useRealTimers()
})

/** Rows of the read-only page as `[label, value]`, in display order. */
function detailRows() {
  const labels = screen.getAllByRole('term').map((term) => term.textContent)
  const values = screen.getAllByRole('definition').map((value) => value.textContent)
  return labels.map((label, i) => [label, values[i]])
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
  it('lists exactly Cellular, Hub and Tailscale with live summaries', async () => {
    const { user } = renderSettings()

    await open(user, 'Connectivity')

    const rows = settingsRows().map((row) => row.textContent)
    expect(rows).toEqual(['CellularLTE · O2', 'HubConnected', `Tailscale${connectedTailscale.ip}`])
  })

  it.each([
    ['connecting', 'Connecting…'],
    ['disconnected', 'Down — showing last-known state'],
  ] as const)('summarises a %s Bus link as "%s"', async (busStatus, text) => {
    const { user } = renderSettings({ busStatus })

    await open(user, 'Connectivity')

    expect(screen.getByRole('button', { name: /^Hub/ })).toHaveTextContent(text)
  })

  it('summarises the Cellular row as Checking before the router has reported', async () => {
    const { user } = renderSettings({ router: undefined, routerUpdatedAt: undefined })

    await open(user, 'Connectivity')

    expect(screen.getByRole('button', { name: /^Cellular/ })).toHaveTextContent('Checking…')
  })

  it('degrades the Cellular summary to Offline when the router feed goes stale', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const { user } = renderSettings({ routerUpdatedAt: Date.now() })
    await open(user, 'Connectivity')
    expect(screen.getByRole('button', { name: /^Cellular/ })).toHaveTextContent('LTE · O2')

    // No new router data, no other re-render trigger: only the clock moves.
    act(() => {
      vi.advanceTimersByTime(210_000)
    })

    expect(screen.getByRole('button', { name: /^Cellular/ })).toHaveTextContent('Offline')
  })
})

describe('Cellular', () => {
  it('lists every router field with its unit and formatting', async () => {
    const { user } = renderSettings({ router: liveRouter })

    await open(user, 'Connectivity', 'Cellular')

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

    await open(user, 'Connectivity', 'Cellular')

    expect(detailRows()[0]).toEqual(['Operator', '99999'])
  })

  it('shows a dash for each field not yet received, keeping every row', async () => {
    const { user } = renderSettings({ router: { signal_rsrp_dbm: -85 } })

    await open(user, 'Connectivity', 'Cellular')

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

    await open(user, 'Connectivity', 'Cellular')

    expect(detailRows().at(-1)).toEqual(['Data this month', '—'])
  })

  it('shows dashes for every field before any router has reported', async () => {
    const { user } = renderSettings({ router: undefined })

    await open(user, 'Connectivity', 'Cellular')

    const rows = detailRows()
    expect(rows).toHaveLength(8)
    expect(rows.every(([, value]) => value === '—')).toBe(true)
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
    await open(user, 'Connectivity', 'Cellular')

    expect(screen.getByRole('heading', { name: 'Cellular' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Connectivity' }))
    expect(screen.getByRole('heading', { name: 'Connectivity' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cellular/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    expect(screen.getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
  })
})
