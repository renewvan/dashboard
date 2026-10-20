import { describe, expect, it } from 'vite-plus/test'
import type { ConnectionInputs } from './connection'
import { cellularTier, connectionTier } from './connection'

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

  it("reads no-service below -115 even while the node reports online — radio-silent isn't offline", () => {
    expect(cellularTier(-115.1, 'online', FRESH, NOW)).toBe('no-service')
    expect(cellularTier(-120, 'online', FRESH, NOW)).toBe('no-service')
  })
})

describe('cellularTier offline resolution', () => {
  it('goes offline the moment the node health says offline, even with fresh data', () => {
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

  it('is connected when the router node reports offline but the bus is up', () => {
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
