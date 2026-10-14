import { describe, expect, it } from 'vitest'
import type { Battery, Tank } from '@/types'
import { batteryDial, formatTimeToGo, tankDial, tankDialOf } from './dialView'

const NOW = new Date('2026-07-14T12:00:00Z')

function tank(overrides: Partial<Tank> = {}): Tank {
  return {
    fluid_type: 'fresh_water',
    capacity_l: 100,
    level_pct: 62,
    status: 'ok',
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

function battery(overrides: Partial<Battery> = {}): Battery {
  return {
    soc_pct: 78,
    voltage_v: 13.24,
    current_a: -2.6,
    power_w: -34.6,
    temperature_c: 21,
    charge_state: 'float',
    ...overrides,
  }
}

const GREY_ALARM = {
  fluid_type: 'grey_water' as const,
  alarm_direction: 'high' as const,
  alarm_threshold_pct: 90,
  alarm_restore_pct: 80,
}

describe('batteryDial', () => {
  it('has no dial until a battery has fully arrived over MQTT', () => {
    expect(batteryDial({})).toBeUndefined()
    expect(batteryDial({ house: { soc_pct: 78 } })).toBeUndefined()
  })

  it('reads the level, voltage and absolute power, whichever way the power flows', () => {
    const charging = batteryDial({ house: battery({ power_w: 120.4 }) })
    const discharging = batteryDial({ house: battery({ power_w: -120.4 }) })
    expect(charging?.sub).toBe('13.24V / 120W')
    expect(discharging?.sub).toBe('13.24V / 120W')
    expect(charging?.unitsStrong).toBe(true)
  })

  it('clamps an out-of-range state of charge into the arc', () => {
    expect(batteryDial({ house: battery({ soc_pct: 104 }) })?.pct).toBe(100)
    expect(batteryDial({ house: battery({ soc_pct: -3 }) })?.pct).toBe(0)
  })

  it('skips a half-arrived battery and shows the next complete one', () => {
    const view = batteryDial({ a: { soc_pct: 10 }, b: battery({ soc_pct: 55 }) })
    expect(view?.pct).toBe(55)
  })

  it('shows a battery whose source publishes only the core fields', () => {
    // A shunt has no temperature probe and no charge stage, so neither optional property is
    // ever published. Captured from a real SmartShunt via Venus OS.
    const view = batteryDial({
      '290': { soc_pct: 99.3, voltage_v: 13.44, current_a: 0.6, power_w: 8.06 },
    })
    expect(view?.pct).toBe(99.3)
    expect(view?.sub).toBe('13.44V / 8W')
  })
})

describe('formatTimeToGo', () => {
  it('shows the two largest units, truncating rather than rounding up', () => {
    expect(formatTimeToGo(9 * 86_400 + 23 * 3_600 + 59 * 60 + 59)).toBe('9d 23h to go')
    expect(formatTimeToGo(5 * 3_600 + 12 * 60 + 59)).toBe('5h 12m to go')
    expect(formatTimeToGo(42 * 60)).toBe('42m to go')
  })

  it('drops the smaller unit only at a boundary, not when it is zero', () => {
    expect(formatTimeToGo(86_400)).toBe('1d 0h to go')
    expect(formatTimeToGo(3_600)).toBe('1h 0m to go')
  })

  it('reads under a minute as <1m', () => {
    expect(formatTimeToGo(0)).toBe('<1m to go')
    expect(formatTimeToGo(59)).toBe('<1m to go')
  })

  it("shows Venus's ten-day cap as 9d 23h, like the Venus screen", () => {
    expect(formatTimeToGo(863_999.9375)).toBe('9d 23h to go')
  })
})

describe('tankDial', () => {
  it('shows litres from the raw level against the capacity', () => {
    const view = tankDial(tank({ capacity_l: 80, level_pct: 41 }), NOW)
    expect(view.pct).toBe(41)
    expect(view.sub).toBe('33 / 80 \u2113')
    expect(view.unitsStrong).toBe(true)
  })

  it('paints a grey tank with the tank alert zones: normal, caution, danger', () => {
    const colorAt = (level_pct: number) => tankDial(tank({ ...GREY_ALARM, level_pct }), NOW).color
    const normal = colorAt(60)
    expect(colorAt(80)).toBe(normal)
    expect(colorAt(85)).toBe('var(--warning)')
    expect(colorAt(90)).toBe('var(--danger)')
    expect(colorAt(95)).toBe('var(--danger)')
    expect(normal).not.toBe('var(--warning)')
    expect(normal).not.toBe('var(--danger)')
  })

  it('shows an empty, danger-painted dial with the fault reason instead of a level', () => {
    const view = tankDial(tank({ status: 'open_circuit', level_pct: 62 }), NOW)
    expect(view.faulted).toBe(true)
    expect(view.pct).toBe(0)
    expect(view.color).toBe('var(--danger)')
    expect(view.sub).toBe('Open circuit')
    expect(view.unitsStrong).toBe(false)
  })
})

describe('tankDialOf', () => {
  it('finds a tank by fluid type, not by its id', () => {
    const tanks = {
      a: tank({ fluid_type: 'grey_water', level_pct: 30 }),
      b: tank({ level_pct: 70 }),
    }
    expect(tankDialOf(tanks, 'fresh_water', NOW)?.pct).toBe(70)
    expect(tankDialOf(tanks, 'grey_water', NOW)?.pct).toBe(30)
  })

  it('has no dial for a fluid with no tank, or one still arriving', () => {
    expect(tankDialOf({}, 'fresh_water', NOW)).toBeUndefined()
    expect(
      tankDialOf({ fresh: { fluid_type: 'fresh_water', capacity_l: 100 } }, 'fresh_water', NOW),
    ).toBeUndefined()
    expect(tankDialOf({ fresh: tank() }, 'grey_water', NOW)).toBeUndefined()
  })
})
