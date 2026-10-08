import { describe, expect, it } from 'vitest'
import { formatDeg, isLevel, rearViewRotation, sideViewRotation, tiltReading } from './tilt'

describe('tiltReading', () => {
  it('returns the angles while the sensor is ok', () => {
    expect(tiltReading({ roll_deg: 1.5, pitch_deg: -2, status: 'ok' })).toEqual({
      roll: 1.5,
      pitch: -2,
    })
  })

  it('hides the last retained angles once the node reports sensor_error', () => {
    expect(tiltReading({ roll_deg: 1.5, pitch_deg: -2, status: 'sensor_error' })).toEqual({
      roll: null,
      pitch: null,
    })
  })

  it('shows nothing until every field has arrived', () => {
    expect(tiltReading({ roll_deg: 1, status: 'ok' })).toEqual({ roll: null, pitch: null })
    expect(tiltReading({ roll_deg: 1, pitch_deg: 2 })).toEqual({ roll: null, pitch: null })
    expect(tiltReading(undefined)).toEqual({ roll: null, pitch: null })
  })
})

describe('isLevel', () => {
  it('is inclusive of the 1 degree tolerance on both sides', () => {
    expect(isLevel(1)).toBe(true)
    expect(isLevel(-1)).toBe(true)
    expect(isLevel(1.01)).toBe(false)
    expect(isLevel(-1.01)).toBe(false)
  })

  it('is never level without a reading', () => {
    expect(isLevel(null)).toBe(false)
  })
})

describe('formatDeg', () => {
  it('signs positive values and keeps one decimal', () => {
    expect(formatDeg(4)).toBe('+4.0°')
    expect(formatDeg(-2.24)).toBe('-2.2°')
  })

  it('never renders negative zero', () => {
    expect(formatDeg(-0.04)).toBe('0.0°')
    expect(formatDeg(0)).toBe('0.0°')
  })

  it('shows a dash with no reading', () => {
    expect(formatDeg(null)).toBe('—')
  })
})

describe('rotation direction', () => {
  // Side van faces right, rear van is seen from behind. CSS rotate(+deg) is
  // clockwise.
  it('lifts the nose (right end) clockwise when pitched nose-up', () => {
    expect(sideViewRotation(8)).toBeGreaterThan(0)
    expect(sideViewRotation(-8)).toBeLessThan(0)
  })

  it('drops the left end (counter-clockwise) when rolled left-side-down', () => {
    expect(rearViewRotation(10)).toBeLessThan(0)
    expect(rearViewRotation(-10)).toBeGreaterThan(0)
  })

  it('stops drawing past the clamp but not before it', () => {
    expect(sideViewRotation(40)).toBe(15)
    expect(sideViewRotation(-40)).toBe(-15)
    expect(rearViewRotation(40)).toBe(-15)
    expect(sideViewRotation(15)).toBe(15)
  })

  it('stays upright without a reading', () => {
    expect(sideViewRotation(null)).toBe(0)
    expect(rearViewRotation(null)).toBe(0)
  })
})
