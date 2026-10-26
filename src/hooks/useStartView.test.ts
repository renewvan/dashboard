import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useStartView } from './useStartView'

const KEY = 'renewvan-dashboard-start-view'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('useStartView', () => {
  it('is the Cockpit when nothing is stored', () => {
    const { result } = renderHook(() => useStartView())
    expect(result.current[0]).toBe('cockpit')
  })

  it('reads the Cockpit for anything stored that is not a view', () => {
    localStorage.setItem(KEY, 'carousel')
    const { result } = renderHook(() => useStartView())
    expect(result.current[0]).toBe('cockpit')
  })

  it('persists a choice across a remount', () => {
    const first = renderHook(() => useStartView())
    act(() => first.result.current[1]('masonry'))
    first.unmount()

    const second = renderHook(() => useStartView())
    expect(second.result.current[0]).toBe('masonry')
    expect(localStorage.getItem(KEY)).toBe('masonry')
  })
})
