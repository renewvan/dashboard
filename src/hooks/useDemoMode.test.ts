import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useDemoMode } from './useDemoMode'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useDemoMode', () => {
  it('defaults to off so a real van never silently shows fake data', () => {
    const { result } = renderHook(() => useDemoMode())
    expect(result.current[0]).toBe(false)
  })

  it('persists an enabled choice across remounts', () => {
    const first = renderHook(() => useDemoMode())
    act(() => first.result.current[1](true))
    first.unmount()

    const second = renderHook(() => useDemoMode())
    expect(second.result.current[0]).toBe(true)
  })

  it('persists switching back off', () => {
    const first = renderHook(() => useDemoMode())
    act(() => first.result.current[1](true))
    act(() => first.result.current[1](false))
    first.unmount()

    const second = renderHook(() => useDemoMode())
    expect(second.result.current[0]).toBe(false)
  })
})
