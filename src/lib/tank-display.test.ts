import { describe, expect, it } from 'vite-plus/test'
import { consumptionRateLph, formatLatchDate, sortTankIds, tankSummary } from './tank-display'

const HOUR_MS = 3_600_000

describe('consumptionRateLph', () => {
  const now = new Date('2026-07-14T12:00:00Z')

  it('is undefined with no latch to measure a pace against', () => {
    expect(consumptionRateLph(20, undefined, now)).toBeUndefined()
  })

  it('is undefined for the first minute after the latch', () => {
    const latch = new Date(now.getTime() - 59_000).toISOString()
    expect(consumptionRateLph(20, latch, now)).toBeUndefined()
  })

  it('starts reporting at exactly one minute (the floor is inclusive)', () => {
    const latch = new Date(now.getTime() - 60_000).toISOString()
    expect(consumptionRateLph(1, latch, now)).toBeCloseTo(60)
  })

  it('is litres per hour since the latch', () => {
    const latch = new Date(now.getTime() - 10 * HOUR_MS).toISOString()
    expect(consumptionRateLph(20, latch, now)).toBeCloseTo(2)
  })

  it('reads the latch timestamp with its local UTC offset', () => {
    // Both instants are 08:00Z, so both are 4h before `now` (12:00Z).
    expect(consumptionRateLph(8, '2026-07-14T08:00:00+00:00', now)).toBeCloseTo(2)
    expect(consumptionRateLph(8, '2026-07-14T05:00:00-03:00', now)).toBeCloseTo(2)
  })
})

describe('formatLatchDate', () => {
  it('uses the fixed "14 Jul 2026 09:41" shape, zero-padding the time', () => {
    // Built from local components so the expectation holds in any timezone.
    const local = new Date(2026, 6, 4, 9, 5)
    expect(formatLatchDate(local.toISOString())).toBe('4 Jul 2026 09:05')
  })

  it('does not follow the browser locale (no comma, no AM/PM)', () => {
    const local = new Date(2026, 6, 14, 21, 41)
    expect(formatLatchDate(local.toISOString())).toBe('14 Jul 2026 21:41')
  })
})

describe('sortTankIds', () => {
  it('puts fresh before grey regardless of input order', () => {
    expect(sortTankIds(['grey', 'fresh'])).toEqual(['fresh', 'grey'])
    expect(sortTankIds(['fresh', 'grey'])).toEqual(['fresh', 'grey'])
  })

  it('puts every other tank after them, ordered by id', () => {
    expect(sortTankIds(['propane', 'black', 'grey', 'fuel', 'fresh'])).toEqual([
      'fresh',
      'grey',
      'black',
      'fuel',
      'propane',
    ])
  })

  it('keeps grey first when fresh is absent', () => {
    expect(sortTankIds(['black', 'grey'])).toEqual(['grey', 'black'])
  })

  it('does not mutate its input', () => {
    const ids = ['grey', 'fresh']
    sortTankIds(ids)
    expect(ids).toEqual(['grey', 'fresh'])
  })
})

describe('tankSummary', () => {
  it('says so when no tank has reported', () => {
    expect(tankSummary([])).toBe('No tanks found')
  })

  it('counts tanks, singular and plural', () => {
    expect(tankSummary(['fresh'])).toBe('1 tank')
    expect(tankSummary(['fresh', 'grey'])).toBe('2 tanks')
  })
})
