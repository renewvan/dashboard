import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { resolveMapIsDark, useMapTheme } from './useMapTheme'

const STORAGE_KEY = 'renewvan-dashboard-map-theme'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useMapTheme', () => {
  it('defaults to auto on a fresh kiosk, so the map keeps following the app theme', () => {
    const { result } = renderHook(() => useMapTheme())
    expect(result.current[0]).toBe('auto')
  })

  it.each(['light', 'dark', 'auto'] as const)('persists %s across remounts', (choice) => {
    const first = renderHook(() => useMapTheme())
    act(() => first.result.current[1](choice))
    first.unmount()

    const second = renderHook(() => useMapTheme())
    expect(second.result.current[0]).toBe(choice)
  })

  it('reads an unknown stored value as auto rather than breaking the map', () => {
    window.localStorage.setItem(STORAGE_KEY, 'sepia')
    const { result } = renderHook(() => useMapTheme())
    expect(result.current[0]).toBe('auto')
  })
})

describe('resolveMapIsDark', () => {
  it('follows the app theme on auto', () => {
    expect(resolveMapIsDark('auto', true)).toBe(true)
    expect(resolveMapIsDark('auto', false)).toBe(false)
  })

  it('ignores the app theme when the map is pinned', () => {
    expect(resolveMapIsDark('dark', false)).toBe(true)
    expect(resolveMapIsDark('light', true)).toBe(false)
  })
})
