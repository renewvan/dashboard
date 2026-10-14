import { describe, expect, it } from 'vitest'
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
      leftBottom: { source: 'solar', fullScaleW: 250 },
      right: { source: 'battery-out', fullScaleW: 3000 },
      rings: ['fuel', 'battery', 'black_water'],
    }
    expect(parseStartPowerSources(JSON.stringify(stored))).toEqual(stored)
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
      leftBottom: { source: 'solar', fullScaleW: 250 },
      right: 'nonsense',
    }
    expect(parseStartPowerSources(JSON.stringify(stored))).toEqual({
      leftTop: DEFAULT_START_POWER_SOURCES.leftTop,
      leftBottom: { source: 'solar', fullScaleW: 250 },
      right: DEFAULT_START_POWER_SOURCES.right,
      rings: DEFAULT_START_POWER_SOURCES.rings,
    })
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
  it('splits the battery power by direction: charging is positive, load is negative', () => {
    expect(powerOf('battery-in', undefined, 120)).toBe(120)
    expect(powerOf('battery-in', undefined, -120)).toBe(0)
    expect(powerOf('battery-out', undefined, -120)).toBe(120)
    expect(powerOf('battery-out', undefined, 120)).toBe(0)
    expect(powerOf('battery-net', undefined, -120)).toBe(120)
  })

  it('reads solar from the controller, not the battery', () => {
    expect(powerOf('solar', 247, -50)).toBe(247)
  })

  it('has no value until the source has published, never a made-up zero', () => {
    expect(powerOf('solar', undefined, 100)).toBeUndefined()
    expect(powerOf('battery-in', 100, undefined)).toBeUndefined()
    expect(powerOf('battery-out', 100, undefined)).toBeUndefined()
    expect(powerOf('battery-net', 100, undefined)).toBeUndefined()
  })
})
