import { describe, expect, it } from 'vitest'
import { relayLabel } from './relayLabels'

describe('relayLabel', () => {
  it('returns the configured label for a known relay id', () => {
    expect(relayLabel('water_pump')).toBe('Water pump')
  })

  it('falls back to the raw id for an unknown relay id', () => {
    expect(relayLabel('some_new_relay')).toBe('some_new_relay')
  })
})
