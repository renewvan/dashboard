import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useDevicesSort } from './useDevicesSort'

const KEY = 'renewvan-dashboard-devices-sort'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('useDevicesSort', () => {
  it('is By Driver when nothing is stored', () => {
    const { result } = renderHook(() => useDevicesSort())
    expect(result.current[0]).toBe('driver')
  })

  it('reads By Driver for anything stored that is not a choice', () => {
    localStorage.setItem(KEY, 'alphabet')
    const { result } = renderHook(() => useDevicesSort())
    expect(result.current[0]).toBe('driver')
  })

  it('persists a choice across a remount', () => {
    const first = renderHook(() => useDevicesSort())
    act(() => first.result.current[1]('entity'))
    first.unmount()

    const second = renderHook(() => useDevicesSort())
    expect(second.result.current[0]).toBe('entity')
    expect(localStorage.getItem(KEY)).toBe('entity')
  })
})
