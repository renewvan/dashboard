import { describe, expect, it } from 'vite-plus/test'
import type { Tilt } from '@/types'
import { centreKind, hasTiltReading, legendIndices, powerReading, ringLabel } from './dialModel'

const OK_TILT: Tilt = { roll_deg: -2.2, pitch_deg: 4, status: 'ok' }

const NONE = { solarW: undefined, batteryW: undefined, loadW: undefined }

describe('powerReading', () => {
  it('fills the band by the share of the configured full scale, in whole watts', () => {
    const reading = powerReading({ source: 'solar', fullScaleW: 400 }, { ...NONE, solarW: 247.4 })
    expect(reading.watts).toBe(247)
    expect(reading.pct).toBeCloseTo(61.85)
    expect(reading.label).toBe('Solar')
  })

  it('caps the band at full when the power exceeds the scale', () => {
    expect(powerReading({ source: 'solar', fullScaleW: 400 }, { ...NONE, solarW: 900 }).pct).toBe(
      100,
    )
  })

  it('shows no watts and an empty band until the source has published, never a made-up zero', () => {
    const reading = powerReading({ source: 'solar', fullScaleW: 400 }, { ...NONE, batteryW: 120 })
    expect(reading.watts).toBeUndefined()
    expect(reading.pct).toBe(0)
  })

  it('reads charging from the battery power, by direction', () => {
    const charging = { source: 'battery-in', fullScaleW: 1000 } as const
    expect(powerReading(charging, { ...NONE, batteryW: 250 }).watts).toBe(250)
    expect(powerReading(charging, { ...NONE, batteryW: -250 }).watts).toBe(0)
  })

  it('reads the load as what the van draws, even while the battery is still charging', () => {
    // 15 W of sun, 9 W of it charging the battery: 6 W is going to the loads, and the reading says so
    // rather than 0 W because the battery is not discharging.
    const load = { source: 'battery-out', fullScaleW: 1000 } as const
    const reading = powerReading(load, { solarW: 15, batteryW: 9, loadW: 6 })
    expect(reading.watts).toBe(6)
    expect(reading.label).toBe('Load')
  })

  it('shows a real 0 W, not a dash, when the load published zero', () => {
    const reading = powerReading({ source: 'battery-out', fullScaleW: 1000 }, { ...NONE, loadW: 0 })
    expect(reading.watts).toBe(0)
    expect(reading.pct).toBe(0)
  })
})

describe('ringLabel', () => {
  it('names the battery and spells tanks out in full', () => {
    expect(ringLabel('battery')).toBe('Battery')
    expect(ringLabel('fresh_water')).toBe('Fresh water')
    expect(ringLabel('lpg')).toBe('LPG')
  })
})

describe('centreKind', () => {
  it('is the tilt while the van has a usable reading', () => {
    expect(hasTiltReading(OK_TILT)).toBe(true)
    expect(centreKind('tilt', OK_TILT)).toBe('tilt')
  })

  it('falls back to the battery with no record, a half-arrived one, or a sensor error', () => {
    expect(centreKind('tilt', undefined)).toBe('battery')
    expect(centreKind('tilt', { roll_deg: 1 })).toBe('battery')
    // The driver keeps retained angles on the broker while in error: they are stale, not live.
    expect(centreKind('tilt', { ...OK_TILT, status: 'sensor_error' })).toBe('battery')
  })

  it('is the van or the battery readout whenever it is chosen, whatever the tilt is doing', () => {
    expect(centreKind('van', OK_TILT)).toBe('van')
    expect(centreKind('van', undefined)).toBe('van')
    expect(centreKind('battery', OK_TILT)).toBe('battery')
  })
})

describe('legendIndices', () => {
  const rings = ['battery', 'fresh_water', 'grey_water'] as const

  it('leaves the battery out while its readout fills the middle', () => {
    expect(legendIndices(rings, 'battery')).toEqual([1, 2])
  })

  it('lists every ring while the tilt fills the middle, so the battery % stays visible', () => {
    expect(legendIndices(rings, 'tilt')).toEqual([0, 1, 2])
  })

  it('lists every ring while the van fills the middle, so the battery % stays visible', () => {
    expect(legendIndices(rings, 'van')).toEqual([0, 1, 2])
  })

  it('drops every ring showing the battery, wherever it sits', () => {
    expect(legendIndices(['battery', 'fuel', 'battery'], 'battery')).toEqual([1])
  })
})
