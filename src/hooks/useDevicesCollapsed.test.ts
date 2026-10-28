import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { useDevicesCollapsed } from './useDevicesCollapsed'

const KEY = 'renewvan-dashboard-devices-collapsed'

beforeEach(() => localStorage.clear())
afterEach(() => localStorage.clear())

describe('useDevicesCollapsed', () => {
  it('has nothing collapsed when nothing is stored', () => {
    const { result } = renderHook(() => useDevicesCollapsed())
    expect(result.current.isCollapsed('relay')).toBe(false)
  })

  it('reads nothing collapsed for anything stored that is not a list of strings', () => {
    localStorage.setItem(KEY, '{"relay":true}')
    const { result } = renderHook(() => useDevicesCollapsed())
    expect(result.current.isCollapsed('relay')).toBe(false)
  })

  it('toggles a section and persists it across a remount', () => {
    const first = renderHook(() => useDevicesCollapsed())
    act(() => first.result.current.toggle('relay'))
    expect(first.result.current.isCollapsed('relay')).toBe(true)
    first.unmount()

    const second = renderHook(() => useDevicesCollapsed())
    expect(second.result.current.isCollapsed('relay')).toBe(true)
    act(() => second.result.current.toggle('relay'))
    expect(second.result.current.isCollapsed('relay')).toBe(false)
    expect(localStorage.getItem(KEY)).toBe('[]')
  })
})
