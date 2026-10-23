import { describe, expect, it } from 'vite-plus/test'
import type { GpsSatellite } from '@/types'
import {
  formatSnr,
  gpsSummary,
  groupSatellites,
  signalFraction,
  signalQuality,
  trackedCount,
} from './gps'

const sat = (
  constellation: GpsSatellite['constellation'],
  prn: number,
  snr_db: number | null,
): GpsSatellite => ({ constellation, prn, snr_db, elevation_deg: 30, azimuth_deg: 100 })

describe('signalQuality', () => {
  it.each([
    [null, 'none'],
    [0, 'poor'],
    [19.9, 'poor'],
    [20, 'fair'],
    [29.9, 'fair'],
    [30, 'good'],
    [39.9, 'good'],
    [40, 'strong'],
    [55, 'strong'],
  ] as const)('reads %s dB-Hz as %s', (snr, expected) => {
    expect(signalQuality(snr)).toBe(expected)
  })

  it('tells a measured zero from no measurement', () => {
    expect(signalQuality(0)).not.toBe(signalQuality(null))
    expect(signalFraction(0)).toBe(0)
    expect(formatSnr(0)).toBe('0 dB-Hz')
    expect(formatSnr(null)).toBe('No signal')
  })
})

describe('signalFraction', () => {
  it('scales to the 50 dB-Hz full scale and clamps outside it', () => {
    expect(signalFraction(25)).toBe(0.5)
    expect(signalFraction(50)).toBe(1)
    expect(signalFraction(63)).toBe(1)
    expect(signalFraction(-3)).toBe(0)
    expect(signalFraction(null)).toBe(0)
  })
})

describe('groupSatellites', () => {
  it('groups by constellation in a fixed order, strongest first, unmeasured last', () => {
    const groups = groupSatellites([
      sat('beidou', 9, null),
      sat('glonass', 65, 30),
      sat('gps', 10, 38),
      sat('gps', 15, 42),
      sat('gps', 4, null),
      sat('beidou', 28, 38),
    ])
    expect(groups.map((g) => g.label)).toEqual(['GPS', 'GLONASS', 'BeiDou'])
    expect(groups[0].satellites.map((s) => s.prn)).toEqual([15, 10, 4])
    expect(groups[2].satellites.map((s) => s.prn)).toEqual([28, 9])
  })

  it('breaks a tie by PRN so equal signals never reshuffle between messages', () => {
    const groups = groupSatellites([sat('gps', 21, 35), sat('gps', 7, 35), sat('gps', 13, 35)])
    expect(groups[0].satellites.map((s) => s.prn)).toEqual([7, 13, 21])
  })

  it('leaves empty constellations out and keeps `other` last', () => {
    const groups = groupSatellites([sat('other', 193, 20), sat('galileo', 4, 30)])
    expect(groups.map((g) => g.constellation)).toEqual(['galileo', 'other'])
    expect(groupSatellites([])).toEqual([])
  })

  it('does not reorder the caller’s array', () => {
    const input = [sat('gps', 1, 10), sat('gps', 2, 40)]
    groupSatellites(input)
    expect(input.map((s) => s.prn)).toEqual([1, 2])
  })
})

describe('trackedCount', () => {
  it('counts satellites with a measurement, a measured 0 included', () => {
    expect(trackedCount([sat('gps', 1, 0), sat('gps', 2, null), sat('gps', 3, 33)])).toBe(2)
  })
})

describe('gpsSummary', () => {
  it('says so before any data has arrived', () => {
    expect(gpsSummary(undefined)).toBe('No data yet')
    expect(gpsSummary({})).toBe('No data yet')
  })

  it('reports satellites in view when there is no fix, and only that when none are listed', () => {
    expect(gpsSummary({ fix_quality: 'no_fix', satellites: [sat('gps', 1, 12)] })).toBe(
      'No fix, 1 in view',
    )
    expect(gpsSummary({ fix_quality: 'no_fix' })).toBe('No fix')
  })

  it('reports satellites in use once there is a fix', () => {
    expect(gpsSummary({ fix_quality: 'gps', satellites_in_use: 9 })).toBe('9 satellites in use')
  })
})
