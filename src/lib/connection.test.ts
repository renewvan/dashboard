import { describe, expect, it } from 'vitest'
import { connectionTier } from './connection'

const NOW = 1_791_288_000_000 // 2026-10-03T12:00:00Z
const FRESH = NOW - 30_000 // 30 s ago — inside the 180 s window

describe('connectionTier band edges (LTE-calibrated)', () => {
  it('maps rsrp to 4/3/2/1 bars with inclusive lower edges', () => {
    expect(connectionTier(-85, 'online', FRESH, NOW)).toBe('bars-4')
    expect(connectionTier(-84, 'online', FRESH, NOW)).toBe('bars-4')
    expect(connectionTier(-85.1, 'online', FRESH, NOW)).toBe('bars-3')
    expect(connectionTier(-95, 'online', FRESH, NOW)).toBe('bars-3')
    expect(connectionTier(-95.1, 'online', FRESH, NOW)).toBe('bars-2')
    expect(connectionTier(-105, 'online', FRESH, NOW)).toBe('bars-2')
    expect(connectionTier(-105.1, 'online', FRESH, NOW)).toBe('bars-1')
    expect(connectionTier(-115, 'online', FRESH, NOW)).toBe('bars-1')
  })

  it("reads no-service below -115 even while the node reports online — radio-silent isn't offline", () => {
    expect(connectionTier(-115.1, 'online', FRESH, NOW)).toBe('no-service')
    expect(connectionTier(-120, 'online', FRESH, NOW)).toBe('no-service')
  })
})

describe('connectionTier offline resolution', () => {
  it('goes offline the moment the node health says offline, even with fresh data', () => {
    expect(connectionTier(-85, 'offline', FRESH, NOW)).toBe('offline')
  })

  it('goes offline when the newest router property is older than 180 s', () => {
    expect(connectionTier(-85, 'online', NOW - 180_000, NOW)).toBe('bars-4')
    expect(connectionTier(-85, 'online', NOW - 180_001, NOW)).toBe('offline')
    expect(connectionTier(-85, 'online', NOW - 181_000, NOW)).toBe('offline')
  })

  it('stays honest with unknown health — staleness alone decides', () => {
    expect(connectionTier(-85, null, FRESH, NOW)).toBe('bars-4')
    expect(connectionTier(-85, null, NOW - 300_000, NOW)).toBe('offline')
  })
})

describe('connectionTier before anything arrives', () => {
  it('checks while there is no data at all', () => {
    expect(connectionTier(undefined, null, undefined, NOW)).toBe('checking')
  })

  it('keeps checking when data arrived without the signal field yet', () => {
    expect(connectionTier(undefined, 'online', FRESH, NOW)).toBe('checking')
  })
})
