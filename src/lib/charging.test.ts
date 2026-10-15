import { describe, expect, it } from 'vitest'
import { charging, chargerWatts } from './charging'

describe('chargerWatts', () => {
  it('prefers a published power over voltage × current', () => {
    expect(chargerWatts({ voltage_v: 14, current_a: 10, power_w: 120 })).toBe(120)
  })

  it('derives watts from voltage × current when power is not published', () => {
    expect(chargerWatts({ voltage_v: 14, current_a: 10 })).toBe(140)
  })

  it('never reads below zero from a negative current', () => {
    expect(chargerWatts({ voltage_v: 14, current_a: -2 })).toBe(0)
  })

  it('has no value without power or current, never a made-up zero', () => {
    expect(chargerWatts({ voltage_v: 14 })).toBeUndefined()
  })
})

describe('charging', () => {
  it('is undefined with no charger, or one whose voltage has not arrived', () => {
    expect(charging({})).toBeUndefined()
    expect(charging({ 1: { source: 'alternator', current_a: 5 } })).toBeUndefined()
  })

  it('maps alternator and ac to their kinds', () => {
    expect(charging({ 1: { voltage_v: 13, source: 'alternator' } })?.kind).toBe('alternator')
    expect(charging({ 1: { voltage_v: 13, source: 'ac' } })?.kind).toBe('shore')
  })

  it('shows neither a dc nor an unknown source', () => {
    expect(charging({ 1: { voltage_v: 13, source: 'dc' } })).toBeUndefined()
    expect(charging({ 1: { voltage_v: 13, source: 'unknown' } })).toBeUndefined()
  })

  it('prefers the alternator whichever order the chargers arrive in', () => {
    const ac = { voltage_v: 14, source: 'ac' as const }
    const alt = { voltage_v: 13, source: 'alternator' as const }
    expect(charging({ 1: ac, 2: alt })?.kind).toBe('alternator')
    expect(charging({ 1: alt, 2: ac })?.kind).toBe('alternator')
  })
})
