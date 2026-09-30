import { describe, expect, it } from 'vitest'
import { TANK_ALARM_CONFIGS, tankAlarmZone } from './tank-alarm'

// Boundary semantics must match node-tank's `_crossed` (driver.py): entry
// is inclusive of the threshold, restore inclusive of the restore level,
// so caution is the open band between them.
describe('tankAlarmZone', () => {
  const fresh = TANK_ALARM_CONFIGS.fresh // low: threshold 27, restore 48
  const grey = TANK_ALARM_CONFIGS.grey // high: threshold 90, restore 80

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
