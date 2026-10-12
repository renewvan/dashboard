import { describe, expect, it } from 'vitest'
import type { Battery, Tank } from '@/types'
import { batteryDial, tankDial, tankDialOf } from './dialView'

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
    expect(charging?.sub).toBe('13.2V / 120W')
    expect(discharging?.sub).toBe('13.2V / 120W')
  })

  it('clamps an out-of-range state of charge into the arc', () => {
    expect(batteryDial({ house: battery({ soc_pct: 104 }) })?.pct).toBe(100)
    expect(batteryDial({ house: battery({ soc_pct: -3 }) })?.pct).toBe(0)
  })

  it('skips a half-arrived battery and shows the next complete one', () => {
    const view = batteryDial({ a: { soc_pct: 10 }, b: battery({ soc_pct: 55 }) })
    expect(view?.pct).toBe(55)
  })
})

describe('tankDial', () => {
  it('shows litres from the raw level against the capacity', () => {
    const view = tankDial(tank({ capacity_l: 80, level_pct: 41 }), NOW)
    expect(view.pct).toBe(41)
    expect(view.sub).toBe('33 / 80 \u2113')
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
