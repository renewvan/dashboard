import { describe, expect, it } from 'vite-plus/test'
import type { Battery, Charger } from '@/types'
import { starterBattery } from './starterBattery'

const house: Battery = { soc_pct: 93, voltage_v: 12.95, current_a: -26.4, power_w: -342 }
const orion: Charger = {
  voltage_v: 12.94,
  input_voltage_v: 12.31,
  input_voltage_alarm: 'low',
  source: 'alternator',
}

describe('starterBattery', () => {
  it('reads the starter battery off the alternator charger input', () => {
    expect(starterBattery({ shunt: house }, { orion })).toEqual({
      voltage: 12.31,
      low: true,
      source: 'charger',
    })
  })

  it("prefers a battery monitor's aux input on the starter battery over the charger", () => {
    const shunt = { ...house, starter_voltage_v: 12.62, starter_voltage_alarm: 'ok' as const }

    expect(starterBattery({ shunt }, { orion })).toEqual({
      voltage: 12.62,
      low: false,
      source: 'battery',
    })
  })

  it('ignores an AC charger: its input is mains, not the starter battery', () => {
    const mains: Charger = { voltage_v: 13.3, input_voltage_v: 230, source: 'ac' }

    expect(starterBattery({}, { mains })).toBeUndefined()
  })

  it('is not low while the driver has published no alarm', () => {
    const quiet: Charger = { ...orion, input_voltage_alarm: undefined }

    expect(starterBattery({}, { orion: quiet })?.low).toBe(false)
  })

  it('is undefined when nothing reports the starter battery', () => {
    expect(starterBattery({ shunt: house }, {})).toBeUndefined()
  })

  it('takes the first source by sorted id, so the reading does not jump between devices', () => {
    const a = { ...house, starter_voltage_v: 12.5 }
    const b = { ...house, starter_voltage_v: 12.7 }

    expect(starterBattery({ b, a }, {})?.voltage).toBe(12.5)
  })
})
