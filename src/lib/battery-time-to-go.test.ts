import { describe, expect, it } from 'vite-plus/test'
import { batteryTimeToGoS } from './time-to-go'

const base = { soc_pct: 50, current_a: -10 }

describe('batteryTimeToGoS', () => {
  it('prefers the source estimate', () => {
    expect(batteryTimeToGoS({ ...base, time_to_go_s: 123 })).toBe(123)
  })
  it('falls back to remaining_ah over the discharge current', () => {
    expect(batteryTimeToGoS({ ...base, remaining_ah: 100 })).toBe(36_000)
  })
  it('falls back to capacity × SoC when there is no fuel gauge', () => {
    expect(batteryTimeToGoS({ ...base, capacity_ah: 200 })).toBe(36_000)
  })
  it('has no estimate while charging, idle or without capacity', () => {
    expect(batteryTimeToGoS({ ...base, current_a: 5, remaining_ah: 100 })).toBeUndefined()
    expect(batteryTimeToGoS({ ...base, current_a: -0.05, remaining_ah: 100 })).toBeUndefined()
    expect(batteryTimeToGoS(base)).toBeUndefined()
  })
})
