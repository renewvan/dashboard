import { describe, expect, it } from 'vite-plus/test'
import type { ConnectionInputs } from './connection'
import { cellularTier, connectionBadge, connectionTier, networkTypeLabel } from './connection'

const NOW = 1_791_288_000_000 // 2026-10-03T12:00:00Z
const FRESH = NOW - 30_000 // 30 s ago — inside the 180 s window

describe('cellularTier band edges (LTE-calibrated)', () => {
  it('maps rsrp to 4/3/2/1 bars with inclusive lower edges', () => {
    expect(cellularTier(-85, 'online', FRESH, NOW)).toBe('bars-4')
    expect(cellularTier(-84, 'online', FRESH, NOW)).toBe('bars-4')
    expect(cellularTier(-85.1, 'online', FRESH, NOW)).toBe('bars-3')
    expect(cellularTier(-95, 'online', FRESH, NOW)).toBe('bars-3')
    expect(cellularTier(-95.1, 'online', FRESH, NOW)).toBe('bars-2')
    expect(cellularTier(-105, 'online', FRESH, NOW)).toBe('bars-2')
    expect(cellularTier(-105.1, 'online', FRESH, NOW)).toBe('bars-1')
    expect(cellularTier(-115, 'online', FRESH, NOW)).toBe('bars-1')
  })

  it("reads no-service below -115 even while the driver reports online — radio-silent isn't offline", () => {
    expect(cellularTier(-115.1, 'online', FRESH, NOW)).toBe('no-service')
    expect(cellularTier(-120, 'online', FRESH, NOW)).toBe('no-service')
  })
})

describe('cellularTier offline resolution', () => {
  it('goes offline the moment the driver health says offline, even with fresh data', () => {
    expect(cellularTier(-85, 'offline', FRESH, NOW)).toBe('offline')
  })

  it('goes offline when the newest router property is older than 180 s', () => {
    expect(cellularTier(-85, 'online', NOW - 180_000, NOW)).toBe('bars-4')
    expect(cellularTier(-85, 'online', NOW - 180_001, NOW)).toBe('offline')
    expect(cellularTier(-85, 'online', NOW - 181_000, NOW)).toBe('offline')
  })

  it('stays honest with unknown health — staleness alone decides', () => {
    expect(cellularTier(-85, null, FRESH, NOW)).toBe('bars-4')
    expect(cellularTier(-85, null, NOW - 300_000, NOW)).toBe('offline')
  })
})

describe('cellularTier before anything arrives', () => {
  it('checks while there is no data at all', () => {
    expect(cellularTier(undefined, null, undefined, NOW)).toBe('checking')
  })

  it('keeps checking when data arrived without the signal field yet', () => {
    expect(cellularTier(undefined, 'online', FRESH, NOW)).toBe('checking')
  })
})

const TAILSCALE_UP = {
  enabled: true,
  connected: true,
  ip: '100.64.0.1',
  hostname: 'renewvan',
  peers: 1,
}
const TAILSCALE_DOWN = { enabled: true, connected: false, ip: null, hostname: null, peers: 0 }

/** A van with no router feed at all, hub bus up — the wifi / Tailscale-only case. */
const noRouter: ConnectionInputs = {
  rsrp: undefined,
  routerHealth: null,
  lastReceivedAt: undefined,
  now: NOW,
  busStatus: 'connected',
  tailscale: null,
}

describe('connectionTier (header icon)', () => {
  it('is connected, not checking, when the bus is up but the router never reports (wifi / LAN)', () => {
    expect(connectionTier(noRouter)).toBe('connected')
  })

  it('is connected over Tailscale alone while the bus link is down', () => {
    expect(
      connectionTier({ ...noRouter, busStatus: 'disconnected', tailscale: TAILSCALE_UP }),
    ).toBe('connected')
  })

  it('is connected when the router feed goes stale but the bus is still up', () => {
    expect(
      connectionTier({
        ...noRouter,
        rsrp: -85,
        routerHealth: 'online',
        lastReceivedAt: NOW - 181_000,
      }),
    ).toBe('connected')
  })

  it('is connected when the router driver reports offline but the bus is up', () => {
    expect(
      connectionTier({ ...noRouter, rsrp: -85, routerHealth: 'offline', lastReceivedAt: FRESH }),
    ).toBe('connected')
  })

  it('shows cellular bars while the router is feeding, whatever the other paths say', () => {
    const feeding = {
      ...noRouter,
      rsrp: -90,
      routerHealth: 'online' as const,
      lastReceivedAt: FRESH,
    }
    expect(connectionTier(feeding)).toBe('bars-3')
    expect(
      connectionTier({ ...feeding, busStatus: 'disconnected', tailscale: TAILSCALE_DOWN }),
    ).toBe('bars-3')
    expect(connectionTier({ ...feeding, rsrp: -120 })).toBe('no-service')
  })

  it('checks only while the bus link is still coming up', () => {
    expect(connectionTier({ ...noRouter, busStatus: 'connecting' })).toBe('checking')
  })

  it('checks while router data has arrived without its signal field', () => {
    expect(connectionTier({ ...noRouter, routerHealth: 'online', lastReceivedAt: FRESH })).toBe(
      'checking',
    )
  })

  it('is offline only when every path is down', () => {
    expect(connectionTier({ ...noRouter, busStatus: 'disconnected' })).toBe('offline')
    expect(
      connectionTier({ ...noRouter, busStatus: 'disconnected', tailscale: TAILSCALE_DOWN }),
    ).toBe('offline')
  })
})

describe('networkTypeLabel', () => {
  it('reads the radio standard NR as 5G, and shows the rest as the schema names them', () => {
    expect(networkTypeLabel('nr')).toBe('5G')
    expect(networkTypeLabel('lte')).toBe('LTE')
    expect(networkTypeLabel('3g')).toBe('3G')
    expect(networkTypeLabel('2g')).toBe('2G')
  })

  it('reads UNKNOWN for a type the modem has not reported', () => {
    expect(networkTypeLabel('unknown')).toBe('UNKNOWN')
    expect(networkTypeLabel(undefined)).toBe('UNKNOWN')
  })
})

describe('connectionBadge', () => {
  const LAN = { host: '192.168.1.10', route: 'local' } as const

  it('names the mobile technology on the cellular bars', () => {
    expect(connectionBadge('bars-4', 'lte', LAN)).toBe('LTE')
    expect(connectionBadge('bars-1', 'nr', LAN)).toBe('5G')
  })

  it('leaves the badge off while the modem has not said what network it is on', () => {
    expect(connectionBadge('bars-3', 'unknown', LAN)).toBeNull()
    expect(connectionBadge('bars-3', undefined, LAN)).toBeNull()
  })

  it('names how the hub is reached while the van is connected without a router feed', () => {
    expect(connectionBadge('connected', undefined, LAN)).toBe('LAN')
    expect(
      connectionBadge('connected', undefined, { host: '100.64.0.1', route: 'tailscale' }),
    ).toBe('TS')
    expect(
      connectionBadge('connected', undefined, { host: 'hub.example.com', route: 'remote' }),
    ).toBe('WAN')
  })

  it('has no badge for connected without a broker address, or with no connection to name', () => {
    expect(connectionBadge('connected', undefined, null)).toBeNull()
    expect(connectionBadge('offline', 'lte', LAN)).toBeNull()
    expect(connectionBadge('checking', 'lte', LAN)).toBeNull()
    expect(connectionBadge('no-service', 'lte', LAN)).toBeNull()
  })
})
