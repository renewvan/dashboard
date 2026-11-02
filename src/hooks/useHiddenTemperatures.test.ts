import { describe, expect, it } from 'vite-plus/test'
import { DEFAULT_HIDDEN_TEMPERATURES, parseHiddenTemperatures } from './useHiddenTemperatures'

describe('parseHiddenTemperatures', () => {
  it('hides the Pi CPU until a choice is stored', () => {
    expect(parseHiddenTemperatures(null)).toEqual(DEFAULT_HIDDEN_TEMPERATURES)
    expect(DEFAULT_HIDDEN_TEMPERATURES).toEqual(['cpu'])
  })

  it('reads a stored list, and an empty list means every sensor is shown', () => {
    expect(parseHiddenTemperatures('["indoor"]')).toEqual(['indoor'])
    expect(parseHiddenTemperatures('[]')).toEqual([])
  })

  it('drops repeats and anything that is not a string', () => {
    expect(parseHiddenTemperatures('["cpu","cpu",3,null]')).toEqual(['cpu'])
  })

  it('falls back to the default for junk', () => {
    expect(parseHiddenTemperatures('{"a":1}')).toEqual(DEFAULT_HIDDEN_TEMPERATURES)
    expect(parseHiddenTemperatures('not json')).toEqual(DEFAULT_HIDDEN_TEMPERATURES)
  })
})
