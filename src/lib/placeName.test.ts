import { describe, expect, it } from 'vite-plus/test'
import { parsePlaceName, placeCell } from './placeName'

describe('parsePlaceName', () => {
  it('prefers the village, then the town, then the city', () => {
    const all = { village: 'Hamlet', town: 'Townsville', city: 'Metropolis' }
    expect(parsePlaceName({ address: all, display_name: 'Full' })).toBe('Hamlet')
    expect(parsePlaceName({ address: { town: 'Townsville', city: 'Metropolis' } })).toBe(
      'Townsville',
    )
    expect(parsePlaceName({ address: { city: 'Metropolis' } })).toBe('Metropolis')
  })

  it('falls back to the full display name when the address names no settlement', () => {
    expect(parsePlaceName({ address: { road: 'A1' }, display_name: 'A1, Somewhere' })).toBe(
      'A1, Somewhere',
    )
    expect(parsePlaceName({ display_name: 'Somewhere' })).toBe('Somewhere')
  })

  it('skips a blank settlement rather than showing an empty line', () => {
    expect(parsePlaceName({ address: { village: '  ', town: 'Townsville' } })).toBe('Townsville')
  })

  it('has no place for an error body or anything that is not the expected shape', () => {
    expect(parsePlaceName({ error: 'Unable to geocode' })).toBeNull()
    expect(parsePlaceName({ address: { village: 7 }, display_name: 42 })).toBeNull()
    expect(parsePlaceName(null)).toBeNull()
    expect(parsePlaceName('Somewhere')).toBeNull()
  })
})

describe('placeCell', () => {
  it('collapses GPS jitter inside ~110 m to one cell, and separates a real move', () => {
    expect(placeCell(51.50012, -0.12004)).toEqual(placeCell(51.50041, -0.12049))
    expect(placeCell(51.5, -0.12)).not.toEqual(placeCell(51.502, -0.12))
  })
})
