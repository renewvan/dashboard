import { describe, expect, it } from 'vitest'
import {
  convertTemperature,
  formatTemperature,
  sortedSensorIds,
  temperatureReading,
} from './temperature'
import type { TemperatureSensor } from '../types'

const ok = (over: Partial<TemperatureSensor> = {}): TemperatureSensor => ({
  name: 'Indoor',
  unit: 'C',
  source: 'w1',
  temperature_c: 21.4,
  status: 'ok',
  ...over,
})

describe('convertTemperature', () => {
  it.each([
    [0, 32],
    [100, 212],
    [-40, -40],
    [21.5, 70.7],
  ])('%s C -> %s F', (c, f) => {
    expect(convertTemperature(c, 'F')).toBeCloseTo(f, 5)
  })

  it('leaves Celsius untouched', () => {
    expect(convertTemperature(21.4, 'C')).toBe(21.4)
  })
})

describe('temperatureReading', () => {
  it('hides the last retained value once the sensor is no longer ok', () => {
    // The node skips (does not clear) temperature_c on failure, so the stale
    // value is still on the bus next to status != ok.
    expect(temperatureReading(ok({ status: 'no_reading' }))).toBeNull()
    expect(temperatureReading(ok({ status: 'disconnected' }))).toBeNull()
  })

  it('is null before the first value arrives', () => {
    expect(temperatureReading(ok({ temperature_c: undefined }))).toBeNull()
    expect(temperatureReading(undefined)).toBeNull()
  })

  it('keeps a legitimate 0 C reading', () => {
    expect(temperatureReading(ok({ temperature_c: 0 }))).toBe(0)
  })
})

describe('formatTemperature', () => {
  it('rounds to whole degrees in the sensor unit', () => {
    expect(formatTemperature(ok({ temperature_c: 21.6 }))).toBe('22°')
    expect(formatTemperature(ok({ temperature_c: 21.4, unit: 'F' }))).toBe('71°')
  })

  it('appends the unit letter on request', () => {
    expect(formatTemperature(ok({ unit: 'F' }), { suffix: true })).toBe('71°F')
    expect(formatTemperature(ok(), { suffix: true })).toBe('21°C')
  })

  it('shows a placeholder, never a stale number, when not ok', () => {
    expect(formatTemperature(ok({ status: 'disconnected' }))).toBe('--°')
    expect(formatTemperature(ok({ status: 'disconnected', unit: 'F' }), { suffix: true })).toBe(
      '--°F',
    )
    expect(formatTemperature(undefined)).toBe('--°')
  })

  it('never prints negative zero', () => {
    expect(formatTemperature(ok({ temperature_c: -0.2 }))).toBe('0°')
  })

  it('keeps real negatives', () => {
    expect(formatTemperature(ok({ temperature_c: -5.4 }))).toBe('-5°')
  })
})

describe('sortedSensorIds', () => {
  it('puts outdoor, indoor first and the rest alphabetically', () => {
    const ids = sortedSensorIds({
      cpu: ok(),
      '28-0000000000ab': ok(),
      indoor: ok(),
      outdoor: ok(),
    })
    expect(ids).toEqual(['outdoor', 'indoor', '28-0000000000ab', 'cpu'])
  })
})
