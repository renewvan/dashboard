import { describe, expect, it } from 'vite-plus/test'
import type { Battery } from '@/types'
import { completeBatteryIds, primaryBattery } from './primaryBattery'

const battery = (soc_pct: number, extra: Partial<Battery> = {}): Battery => ({
  soc_pct,
  voltage_v: 13.2,
  current_a: 1,
  power_w: 13,
  ...extra,
})

describe('primaryBattery', () => {
  it('is undefined with no battery, or none complete', () => {
    expect(primaryBattery({}, 'auto')).toBeUndefined()
    expect(primaryBattery({ a: { soc_pct: 80 } }, 'auto')).toBeUndefined()
    expect(primaryBattery({ a: { soc_pct: 80 } }, 'a')).toBeUndefined()
  })

  it('auto picks the first complete battery by id, ignoring partial ones', () => {
    const result = primaryBattery({ a: { soc_pct: 10 }, b: battery(55), c: battery(70) }, 'auto')

    expect(result).toEqual({ id: 'b', battery: battery(55), mode: 'auto' })
  })

  it('auto gives the same answer whatever order the batteries arrived in', () => {
    const house = battery(80)
    const bank = battery(60)
    const a = primaryBattery({ wattcycle: bank, '512': house }, 'auto')
    const b = primaryBattery({ '512': house, wattcycle: bank }, 'auto')

    expect(a).toEqual(b)
    expect(a?.id).toBe('512')
  })

  it('compares numeric ids as numbers, so "9" comes before "10"', () => {
    const result = primaryBattery(
      { '10': battery(10), '9': battery(9), '100': battery(100) },
      'auto',
    )

    expect(result?.id).toBe('9')
    expect(completeBatteryIds({ '10': battery(10), '9': battery(9), '100': battery(100) })).toEqual(
      ['9', '10', '100'],
    )
  })

  it('a specific id is that instance while it is on the bus and complete', () => {
    const result = primaryBattery({ a: battery(10), b: battery(55) }, 'b')

    expect(result).toEqual({ id: 'b', battery: battery(55), mode: 'selected' })
  })

  it('selecting the instance auto would pick is still "selected"', () => {
    expect(primaryBattery({ a: battery(10), b: battery(55) }, 'a')?.mode).toBe('selected')
  })

  it('falls back to auto when the selected id is absent', () => {
    const result = primaryBattery({ a: battery(10), b: battery(55) }, 'gone')

    expect(result).toEqual({ id: 'a', battery: battery(10), mode: 'fallback' })
  })

  it('falls back to auto when the selected instance has not fully arrived', () => {
    const result = primaryBattery({ a: battery(10), b: { soc_pct: 55 } }, 'b')

    expect(result).toEqual({ id: 'a', battery: battery(10), mode: 'fallback' })
  })
})
