import { describe, expect, it } from 'vite-plus/test'
import type { Solar } from '@/types'
import {
  firstSolar,
  historyDayLabel,
  formatYield,
  formatYieldAmount,
  yieldAxis,
  yieldHistoryView,
  MIN_HISTORY_REFERENCE_WH,
} from './solarView'

function solar(overrides: Partial<Solar> = {}): Solar {
  return { power_w: 412, battery_voltage_v: 13.4, yield_today_wh: 2140, ...overrides }
}

describe('firstSolar', () => {
  it('has nothing until a controller has its two required fields', () => {
    expect(firstSolar({})).toBeUndefined()
    expect(firstSolar({ a: { power_w: 10 } })).toBeUndefined()
  })

  it('skips a half-arrived controller and shows the next complete one', () => {
    expect(firstSolar({ a: { power_w: 10 }, b: solar({ power_w: 99 }) })?.power_w).toBe(99)
  })

  it('shows a controller that publishes only the required core', () => {
    const core = { power_w: 30, battery_voltage_v: 13 }
    expect(firstSolar({ cheap: core })).toEqual(core)
  })
})

describe('formatYield', () => {
  it('reads watt-hours as kWh to one decimal', () => {
    expect(formatYield(2140)).toBe('2.1')
    expect(formatYield(0)).toBe('0.0')
  })

  it('has no figure when the controller does not report a yield', () => {
    expect(formatYield(undefined)).toBe('—')
  })
})

// The Pi's real payload: 31 days, newest first, index 0 = today (matches yield_today_wh).
const PI_HISTORY = [
  210, 180, 190, 140, 160, 130, 10, 0, 0, 0, 40, 300, 270, 220, 200, 290, 260, 260, 170, 10, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0,
]

describe('yieldHistoryView', () => {
  it('charts the last ten days of the controller log, oldest first so today is rightmost', () => {
    const view = yieldHistoryView(PI_HISTORY)

    expect(view?.days.map((d) => d.wh)).toEqual([0, 0, 0, 10, 130, 160, 140, 190, 180, 210])
    expect(view?.days.map((d) => d.daysAgo)).toEqual([9, 8, 7, 6, 5, 4, 3, 2, 1, 0])
  })

  it('scales every bar against the best day in the window, not the whole log', () => {
    // The 300 Wh day is 11 days back: outside the window, so it must not shrink these bars.
    const view = yieldHistoryView(PI_HISTORY)

    expect(view?.referenceWh).toBe(210)
    expect(view?.days.at(-1)?.share).toBe(1)
    expect(view?.days[3].share).toBeCloseTo(10 / 210)
  })

  it('ignores a better day just outside the window when scaling', () => {
    const history = [...Array<number>(10).fill(120), 900]

    expect(yieldHistoryView(history)?.referenceWh).toBe(120)
  })

  it('keeps a null day as a gap with no height, distinct from a real zero', () => {
    const view = yieldHistoryView([210, null, 0, 150])

    const byAge = Object.fromEntries(view!.days.map((d) => [d.daysAgo, d]))
    expect(byAge[1].wh).toBeNull()
    expect(byAge[2].wh).toBe(0)
  })

  it('does not pad a young controller out to ten days', () => {
    expect(yieldHistoryView([210, 180])?.days).toHaveLength(2)
  })

  it('holds the scale at the floor so a week of overcast days cannot look like a good week', () => {
    const view = yieldHistoryView([20, 10, 30])

    expect(view?.referenceWh).toBe(MIN_HISTORY_REFERENCE_WH)
    expect(view?.days.at(-1)?.share).toBeCloseTo(0.2)
  })

  it('has nothing to draw when the controller publishes no history', () => {
    expect(yieldHistoryView(undefined)).toBeUndefined()
    expect(yieldHistoryView([])).toBeUndefined()
  })
})

describe('yieldAxis', () => {
  it('tops the axis at the smallest 0.5 × 2ⁿ kWh that holds the best day', () => {
    expect(yieldAxis(100).maxKwh).toBe(0.5)
    expect(yieldAxis(500).maxKwh).toBe(0.5)
    expect(yieldAxis(1020).maxKwh).toBe(2)
    expect(yieldAxis(3410).maxKwh).toBe(4)
  })

  it('draws five evenly spaced lines from 0 to the top', () => {
    expect(yieldAxis(3410).ticks).toEqual([0, 1, 2, 3, 4])
    expect(yieldAxis(900).ticks).toEqual([0, 0.25, 0.5, 0.75, 1])
  })
})

describe('formatYieldAmount', () => {
  it('reads Wh below one kWh and kWh from there', () => {
    expect(formatYieldAmount(0)).toEqual({ value: '0', unit: 'Wh' })
    expect(formatYieldAmount(99.6)).toEqual({ value: '100', unit: 'Wh' })
    expect(formatYieldAmount(999)).toEqual({ value: '999', unit: 'Wh' })
    expect(formatYieldAmount(1000)).toEqual({ value: '1.0', unit: 'kWh' })
    expect(formatYieldAmount(2140)).toEqual({ value: '2.1', unit: 'kWh' })
  })
})

describe('historyDayLabel', () => {
  const now = new Date(2026, 9, 28, 14, 0)

  it('names today and yesterday, then counts calendar days back', () => {
    expect(historyDayLabel(0, now)).toBe('Today')
    expect(historyDayLabel(1, now)).toBe('Yesterday')
    expect(historyDayLabel(2, now)).toBe('Mon 26 Oct')
  })

  it('crosses a month boundary', () => {
    expect(historyDayLabel(28, now)).toBe('Wed 30 Sept')
  })
})
