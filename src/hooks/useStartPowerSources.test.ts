import { describe, expect, it } from 'vite-plus/test'
import {
  DEFAULT_START_POWER_SOURCES,
  MAX_FULL_SCALE_W,
  MIN_FULL_SCALE_W,
  clampFullScale,
  parseStartPowerSources,
  powerOf,
} from './useStartPowerSources'

describe('parseStartPowerSources', () => {
  it('reads a valid stored value back exactly', () => {
    const stored = {
      leftTop: { source: 'battery-net', fullScaleW: 800 },
      leftBottom: { fullScaleW: 250 },
      right: { source: 'battery-out', fullScaleW: 3000 },
      rings: ['fuel', 'battery', 'black_water'],
      ringUnit: 'litres',
      centre: 'van',
      temperatures: { left: 'fridge', right: 'cabin' },
    }
    expect(parseStartPowerSources(JSON.stringify(stored))).toEqual(stored)
  })

  it('keeps the default probes when an older save has none, or a bad one', () => {
    const stored = { temperatures: { left: 42, right: '' } }
    expect(parseStartPowerSources(JSON.stringify(stored)).temperatures).toEqual(
      DEFAULT_START_POWER_SOURCES.temperatures,
    )
  })

  it('falls back to the defaults for nothing stored or unparseable text', () => {
    expect(parseStartPowerSources(null)).toEqual(DEFAULT_START_POWER_SOURCES)
    expect(parseStartPowerSources('{not json')).toEqual(DEFAULT_START_POWER_SOURCES)
    expect(parseStartPowerSources('42')).toEqual(DEFAULT_START_POWER_SOURCES)
    expect(parseStartPowerSources('null')).toEqual(DEFAULT_START_POWER_SOURCES)
  })

  it('repairs one bad slot without resetting the others', () => {
    const stored = {
      leftTop: { source: 'shore', fullScaleW: 'lots' },
      leftBottom: { fullScaleW: 250 },
      right: 'nonsense',
    }
    expect(parseStartPowerSources(JSON.stringify(stored))).toEqual({
      leftTop: DEFAULT_START_POWER_SOURCES.leftTop,
      leftBottom: { fullScaleW: 250 },
      right: DEFAULT_START_POWER_SOURCES.right,
      rings: DEFAULT_START_POWER_SOURCES.rings,
      ringUnit: DEFAULT_START_POWER_SOURCES.ringUnit,
      centre: DEFAULT_START_POWER_SOURCES.centre,
      temperatures: DEFAULT_START_POWER_SOURCES.temperatures,
    })
  })

  it('keeps only the scale of a charging slot saved when it still had a source', () => {
    const stored = { leftBottom: { source: 'battery-in', fullScaleW: 600 } }
    expect(parseStartPowerSources(JSON.stringify(stored)).leftBottom).toEqual({ fullScaleW: 600 })
  })

  it('keeps the tilt in the middle for a value saved before the centre was a setting, or an unknown one', () => {
    expect(parseStartPowerSources(JSON.stringify({ ringUnit: 'pct' })).centre).toBe('tilt')
    expect(parseStartPowerSources(JSON.stringify({ centre: 'boat' })).centre).toBe('tilt')
  })

  it('repairs one bad ring without resetting the other two', () => {
    const stored = { rings: ['lpg', 'diesel', 7] }
    expect(parseStartPowerSources(JSON.stringify(stored)).rings).toEqual([
      'lpg',
      DEFAULT_START_POWER_SOURCES.rings[1],
      DEFAULT_START_POWER_SOURCES.rings[2],
    ])
  })

  it('keeps the default rings for a stored value that predates them, or has too few', () => {
    expect(parseStartPowerSources(JSON.stringify({ rings: 'battery' })).rings).toEqual(
      DEFAULT_START_POWER_SOURCES.rings,
    )
    expect(parseStartPowerSources(JSON.stringify({ rings: ['fuel'] })).rings).toEqual([
      'fuel',
      DEFAULT_START_POWER_SOURCES.rings[1],
      DEFAULT_START_POWER_SOURCES.rings[2],
    ])
  })

  it('reads a stored litres unit, and falls back to % for nothing, an unknown value or an older save', () => {
    expect(parseStartPowerSources(JSON.stringify({ ringUnit: 'litres' })).ringUnit).toBe('litres')
    expect(parseStartPowerSources(JSON.stringify({ ringUnit: 'gallons' })).ringUnit).toBe('pct')
    expect(parseStartPowerSources(JSON.stringify({ ringUnit: 3 })).ringUnit).toBe('pct')
    expect(parseStartPowerSources(JSON.stringify({ rings: ['fuel'] })).ringUnit).toBe('pct')
  })

  it('clamps a stored scale into the allowed range, so a band can never be zero-width', () => {
    const stored = {
      leftTop: { source: 'solar', fullScaleW: 0 },
      leftBottom: { source: 'solar', fullScaleW: -5 },
      right: { source: 'solar', fullScaleW: 1e9 },
    }
    const parsed = parseStartPowerSources(JSON.stringify(stored))
    expect(parsed.leftTop.fullScaleW).toBe(MIN_FULL_SCALE_W)
    expect(parsed.leftBottom.fullScaleW).toBe(MIN_FULL_SCALE_W)
    expect(parsed.right.fullScaleW).toBe(MAX_FULL_SCALE_W)
  })
})

describe('clampFullScale', () => {
  it('rounds to whole watts and stays inside the range', () => {
    expect(clampFullScale(412.6)).toBe(413)
    expect(clampFullScale(1)).toBe(MIN_FULL_SCALE_W)
    expect(clampFullScale(99_999)).toBe(MAX_FULL_SCALE_W)
  })
})

describe('powerOf', () => {
  const none = { solarW: undefined, batteryW: undefined, loadW: undefined }

  it('splits the battery power by direction: charging is positive', () => {
    expect(powerOf('battery-in', { ...none, batteryW: 120 })).toBe(120)
    expect(powerOf('battery-in', { ...none, batteryW: -120 })).toBe(0)
    expect(powerOf('battery-net', { ...none, batteryW: -120 })).toBe(120)
  })

  it('reads solar from the controller, not the battery', () => {
    expect(powerOf('solar', { ...none, solarW: 247, batteryW: -50 })).toBe(247)
  })

  it('reads the load from the van, not from the battery', () => {
    expect(powerOf('battery-out', { ...none, batteryW: 9, loadW: 6 })).toBe(6)
    expect(powerOf('battery-out', { ...none, batteryW: -120, loadW: 120 })).toBe(120)
  })

  it('has no value until the source has published, never a made-up zero', () => {
    expect(powerOf('solar', { ...none, batteryW: 100 })).toBeUndefined()
    expect(powerOf('battery-in', { ...none, solarW: 100 })).toBeUndefined()
    expect(powerOf('battery-out', { ...none, solarW: 100, batteryW: 100 })).toBeUndefined()
    expect(powerOf('battery-net', { ...none, solarW: 100 })).toBeUndefined()
  })
})
