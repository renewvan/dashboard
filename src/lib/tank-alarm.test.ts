import { describe, expect, it } from 'vitest'
import type { Tank } from '../types'
import { tankAlarmConfig, tankAlarmZone } from './tank-alarm'

// Boundary semantics must match node-tank's `_crossed` (driver.py): entry
// is inclusive of the threshold, restore inclusive of the restore level,
// so caution is the open band between them.
describe('tankAlarmZone', () => {
  const fresh = { direction: 'low' as const, threshold: 27, restore: 48 }
  const grey = { direction: 'high' as const, threshold: 90, restore: 80 }

  it('low direction: danger at/past the threshold', () => {
    expect(tankAlarmZone(27, fresh)).toBe('danger')
    expect(tankAlarmZone(0, fresh)).toBe('danger')
  })

  it('low direction: caution across the open threshold→restore band', () => {
    expect(tankAlarmZone(27.1, fresh)).toBe('caution')
    expect(tankAlarmZone(47.9, fresh)).toBe('caution')
  })

  it('low direction: normal at/past the restore level', () => {
    expect(tankAlarmZone(48, fresh)).toBe('normal')
    expect(tankAlarmZone(100, fresh)).toBe('normal')
  })

  it('high direction: mirrors the bands around the high threshold', () => {
    expect(tankAlarmZone(90, grey)).toBe('danger')
    expect(tankAlarmZone(100, grey)).toBe('danger')
    expect(tankAlarmZone(85, grey)).toBe('caution')
    expect(tankAlarmZone(80, grey)).toBe('normal')
    expect(tankAlarmZone(0, grey)).toBe('normal')
  })
})

function baseTank(overrides: Partial<Tank> = {}): Tank {
  return {
    fluid_type: 'fresh_water',
    capacity_l: 100,
    level_pct: 50,
    level_pct_smoothed: 50,
    status: 'ok',
    fill_rate_lpm: 0,
    drain_rate_lpm: 0,
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

describe('tankAlarmConfig', () => {
  it('reads direction/threshold/restore off the wire fields (hub schema v0.5)', () => {
    const tank = baseTank({ alarm_direction: 'low', alarm_threshold_pct: 27, alarm_restore_pct: 48 })
    expect(tankAlarmConfig(tank)).toEqual({ direction: 'low', threshold: 27, restore: 48 })
  })

  it('returns undefined when alarm is not configured for the tank', () => {
    expect(tankAlarmConfig(baseTank())).toBeUndefined()
  })

  it('returns undefined if only some of the three wire fields are present', () => {
    expect(tankAlarmConfig(baseTank({ alarm_direction: 'low' }))).toBeUndefined()
    expect(tankAlarmConfig(baseTank({ alarm_threshold_pct: 27, alarm_restore_pct: 48 }))).toBeUndefined()
  })
})
