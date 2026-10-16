import { describe, expect, it } from 'vite-plus/test'
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
  const ACTIVE_W = 5

  it('is undefined with no charger, or one whose voltage has not arrived', () => {
    expect(charging({}, ACTIVE_W)).toBeUndefined()
    expect(charging({ 1: { source: 'alternator', current_a: 5 } }, ACTIVE_W)).toBeUndefined()
  })

  it('maps alternator and ac to their kinds', () => {
    expect(charging({ 1: { voltage_v: 13, source: 'alternator' } }, ACTIVE_W)?.kind).toBe(
      'alternator',
    )
    expect(charging({ 1: { voltage_v: 13, source: 'ac' } }, ACTIVE_W)?.kind).toBe('shore')
  })

  it('shows neither a dc nor an unknown source', () => {
    expect(charging({ 1: { voltage_v: 13, source: 'dc' } }, ACTIVE_W)).toBeUndefined()
    expect(charging({ 1: { voltage_v: 13, source: 'unknown' } }, ACTIVE_W)).toBeUndefined()
  })

  it('names the shore charger while the alternator idles at 0 A, as in a parked van on shore power', () => {
    const alt = { voltage_v: 13.1, current_a: 0, source: 'alternator' as const }
    const ac = { voltage_v: 13.28, current_a: 30, source: 'ac' as const }
    expect(charging({ 1: alt, 2: ac }, ACTIVE_W)).toEqual({ kind: 'shore', watts: 13.28 * 30 })
    expect(charging({ 1: ac, 2: alt }, ACTIVE_W)?.kind).toBe('shore')
  })

  it('names the alternator while the shore charger idles', () => {
    const alt = { voltage_v: 14.2, current_a: 28, source: 'alternator' as const }
    const ac = { voltage_v: 13.6, current_a: 0, source: 'ac' as const }
    expect(charging({ 1: ac, 2: alt }, ACTIVE_W)).toEqual({ kind: 'alternator', watts: 14.2 * 28 })
  })

  it('sums both chargers, whichever order they arrive in, once both are charging', () => {
    const alt = { voltage_v: 14, current_a: 40, source: 'alternator' as const }
    const ac = { voltage_v: 13.5, current_a: 20, source: 'ac' as const }
    expect(charging({ 1: alt, 2: ac }, ACTIVE_W)).toEqual({
      kind: 'chargers',
      watts: 14 * 40 + 13.5 * 20,
    })
    expect(charging({ 1: ac, 2: alt }, ACTIVE_W)).toEqual({
      kind: 'chargers',
      watts: 14 * 40 + 13.5 * 20,
    })
  })

  it('does not count a charger at or below the idle floor as charging', () => {
    const alt = { voltage_v: 14, current_a: 40, source: 'alternator' as const }
    const trickle = { voltage_v: 13.5, power_w: ACTIVE_W, source: 'ac' as const }
    expect(charging({ 1: alt, 2: trickle }, ACTIVE_W)).toEqual({
      kind: 'alternator',
      watts: 14 * 40,
    })
  })

  it('keeps naming the alternator while both idle, so the label never changes in a quiet van', () => {
    const alt = { voltage_v: 13, current_a: 0, source: 'alternator' as const }
    const ac = { voltage_v: 13, current_a: 0, source: 'ac' as const }
    expect(charging({ 1: ac, 2: alt }, ACTIVE_W)?.kind).toBe('alternator')
  })

  it('treats a charger with no published watts as inactive, never as a made-up zero to sum', () => {
    const alt = { voltage_v: 13, source: 'alternator' as const }
    const ac = { voltage_v: 13.5, current_a: 20, source: 'ac' as const }
    expect(charging({ 1: alt, 2: ac }, ACTIVE_W)).toEqual({ kind: 'shore', watts: 13.5 * 20 })
    expect(charging({ 1: alt }, ACTIVE_W)?.watts).toBeUndefined()
  })
})
