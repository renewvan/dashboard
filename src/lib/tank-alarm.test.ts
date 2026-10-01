import { describe, expect, it } from 'vitest'
import type { Tank } from '../types'
import { tankAlarmConfig, tankAlarmZone, tankLevelStatus, tankLiquidColor } from './tank-alarm'

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
    status: 'ok',
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

// A committed alarm_state (the hub's hysteresis bit) only clears once
// level crosses all the way to restore, so while recovering from danger
// it stays 'alarm' for the whole caution band on the way back up —
// distinct from falling, where the bit is still 'ok' throughout caution
// and only flips at the threshold crossing into danger. The zone color
// must defer to the more precise zone math, not the coarser bit, or
// caution never renders while rising (only while falling).
describe('tankLiquidColor', () => {
  const lowConfig = { alarm_direction: 'low' as const, alarm_threshold_pct: 27, alarm_restore_pct: 48 }

  it('shows caution amber while falling through the band (alarm_state still ok)', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'ok' })
    expect(tankLiquidColor(tank, 35)).toBe('var(--warn)')
  })

  it('shows caution amber while rising through the band (alarm_state still alarm)', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'alarm' })
    expect(tankLiquidColor(tank, 35)).toBe('var(--warn)')
  })

  it('still shows red once restored if the bus has not cleared alarm_state yet (no zone info to contradict it)', () => {
    const tank = baseTank({ alarm_state: 'alarm' })
    expect(tankLiquidColor(tank, 62)).toBe('var(--bad)')
  })

  it('shows red in the danger zone regardless of alarm_state', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'ok' })
    expect(tankLiquidColor(tank, 20)).toBe('var(--bad)')
  })

  it('colors the normal band by fluid type, not one shared blue', () => {
    expect(tankLiquidColor(baseTank({ fluid_type: 'fresh_water' }), 50)).toBe('var(--accent)')
    expect(tankLiquidColor(baseTank({ fluid_type: 'grey_water' }), 50)).toBe('var(--accent)')
    expect(tankLiquidColor(baseTank({ fluid_type: 'black_water' }), 50)).toBe('var(--color-stone-800)')
    expect(tankLiquidColor(baseTank({ fluid_type: 'fuel' }), 50)).toBe('var(--color-amber-600)')
    expect(tankLiquidColor(baseTank({ fluid_type: 'lpg' }), 50)).toBe('var(--color-orange-500)')
  })

  it('overrides the fluid color to warn/bad once outside the normal band, regardless of fluid type', () => {
    const tank = baseTank({ fluid_type: 'fuel', ...lowConfig, alarm_state: 'ok' })
    expect(tankLiquidColor(tank, 35)).toBe('var(--warn)')
    expect(tankLiquidColor(tank, 20)).toBe('var(--bad)')
  })
})

describe('tankLevelStatus', () => {
  const lowConfig = { alarm_direction: 'low' as const, alarm_threshold_pct: 27, alarm_restore_pct: 48 }
  const highConfig = { alarm_direction: 'high' as const, alarm_threshold_pct: 90, alarm_restore_pct: 80 }

  it('colors the caution band warning while rising (alarm_state still alarm)', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'alarm' })
    expect(tankLevelStatus(tank, 35)).toEqual({ label: 'Low', color: 'warning' })
  })

  it('colors the caution band warning while falling (alarm_state still ok)', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'ok' })
    expect(tankLevelStatus(tank, 35)).toEqual({ label: 'Low', color: 'warning' })
  })

  it('colors the danger band destructive', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'ok' })
    expect(tankLevelStatus(tank, 20)).toEqual({ label: 'Low', color: 'destructive' })
  })

  it('labels mid-band Normal, not Full/Empty', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'ok' })
    expect(tankLevelStatus(tank, 60)).toEqual({ label: 'Normal', color: 'info' })
  })

  // Full/Empty at the extremes carry whatever severity the zone math
  // assigns there -- a low-direction tank's danger zone sits at the
  // bottom, so 0% reads Empty/error and 100% (deep in its normal zone)
  // reads Full/success; a high-direction tank is the mirror image. This
  // is the same value the header Badge renders -- a tank reading Full
  // must never show green in the badge and red in the Status row.
  it('low-direction: 0% is Empty/destructive (its danger zone), 100% is Full/success (its normal zone)', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'ok' })
    expect(tankLevelStatus(tank, 0)).toEqual({ label: 'Empty', color: 'destructive' })
    expect(tankLevelStatus(tank, 100)).toEqual({ label: 'Full', color: 'success' })
  })

  it('high-direction: 0% is Empty/success (its normal zone), 100% is Full/destructive (its danger zone)', () => {
    const tank = baseTank({ ...highConfig, alarm_state: 'ok' })
    expect(tankLevelStatus(tank, 0)).toEqual({ label: 'Empty', color: 'success' })
    expect(tankLevelStatus(tank, 100)).toEqual({ label: 'Full', color: 'destructive' })
  })

  // Raw sensor readings are rarely exactly 0/100 (e.g. 0.3%, 99.6%), but
  // the card displays them rounded ("0%"/"100%" via pct.toFixed(0)) --
  // Empty/Full must trigger off that same rounded value, or a tank the
  // camper sees reading "0%" keeps showing Low instead of Empty.
  it('rounds a near-zero/near-hundred float reading to Empty/Full, matching the displayed percentage', () => {
    const tank = baseTank({ ...lowConfig, alarm_state: 'ok' })
    expect(tankLevelStatus(tank, 0.3)).toEqual({ label: 'Empty', color: 'destructive' })
    expect(tankLevelStatus(tank, 99.6)).toEqual({ label: 'Full', color: 'success' })
  })
})
