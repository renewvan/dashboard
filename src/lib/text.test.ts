import { describe, expect, it } from 'vite-plus/test'
import { byteLength } from './text'

describe('byteLength', () => {
  it('counts UTF-8 bytes, not characters', () => {
    expect(byteLength('Water pump')).toBe(10)
    expect(byteLength('Café')).toBe(5)
    expect(byteLength('é'.repeat(32))).toBe(64)
  })

  it('counts a four-byte character as four', () => {
    expect(byteLength('\u{1F4A7}')).toBe(4)
  })

  it('is zero for an empty string', () => {
    expect(byteLength('')).toBe(0)
  })
})
