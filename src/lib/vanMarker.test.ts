import { describe, expect, it } from 'vite-plus/test'
import { compassPoint, facesLeft, headingDeg, MIN_HEADING_SPEED_KMH } from './vanMarker'

describe('headingDeg', () => {
  it('is the course while the van is moving', () => {
    expect(headingDeg(90, 50)).toBe(90)
  })

  it('has no heading at a standstill, where the course is stale or jittery', () => {
    expect(headingDeg(90, 0)).toBeNull()
    expect(headingDeg(90, MIN_HEADING_SPEED_KMH - 0.1)).toBeNull()
    expect(headingDeg(90, MIN_HEADING_SPEED_KMH)).toBe(90)
  })

  it('has no heading until both the course and the speed have arrived', () => {
    expect(headingDeg(undefined, 50)).toBeNull()
    expect(headingDeg(90, undefined)).toBeNull()
    expect(headingDeg(Number.NaN, 50)).toBeNull()
  })

  it('normalises into [0, 360)', () => {
    expect(headingDeg(360, 50)).toBe(0)
    expect(headingDeg(-90, 50)).toBe(270)
    expect(headingDeg(725, 50)).toBe(5)
  })
})

describe('facesLeft', () => {
  it('faces right heading east of the north-south line, left heading west of it', () => {
    expect(facesLeft(45)).toBe(false)
    expect(facesLeft(135)).toBe(false)
    expect(facesLeft(225)).toBe(true)
    expect(facesLeft(315)).toBe(true)
  })

  it('keeps facing right at due north and due south, and with no heading', () => {
    expect(facesLeft(0)).toBe(false)
    expect(facesLeft(180)).toBe(false)
    expect(facesLeft(null)).toBe(false)
  })
})

describe('compassPoint', () => {
  it('names the nearest of eight points, wrapping at north', () => {
    expect(compassPoint(0)).toBe('N')
    expect(compassPoint(44)).toBe('NE')
    expect(compassPoint(180)).toBe('S')
    expect(compassPoint(350)).toBe('N')
    expect(compassPoint(359.9)).toBe('N')
  })

  it('is a dash with no heading', () => {
    expect(compassPoint(null)).toBe('—')
  })
})
