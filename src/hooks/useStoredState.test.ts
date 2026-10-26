import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useStoredState } from './useStoredState'

const KEY = 'test-stored-state'
const parse = (raw: string | null) => (raw === 'a' || raw === 'b' ? raw : 'a')

describe('useStoredState', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(() => vi.restoreAllMocks())

  it('reads the stored value and falls back through parse', () => {
    window.localStorage.setItem(KEY, 'b')
    expect(renderHook(() => useStoredState(KEY, parse)).result.current[0]).toBe('b')
    window.localStorage.setItem(KEY, 'junk')
    expect(renderHook(() => useStoredState(KEY, parse)).result.current[0]).toBe('a')
  })

  it('persists changes', () => {
    const { result } = renderHook(() => useStoredState<'a' | 'b'>(KEY, parse))
    act(() => result.current[1]('b'))
    expect(window.localStorage.getItem(KEY)).toBe('b')
  })

  it('does not throw when storage cannot be read or written', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    const { result } = renderHook(() => useStoredState<'a' | 'b'>(KEY, parse))
    expect(result.current[0]).toBe('a')
    act(() => result.current[1]('b'))
    expect(result.current[0]).toBe('b')
  })
})
