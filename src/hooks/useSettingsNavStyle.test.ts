import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useSettingsNavStyle } from './useSettingsNavStyle'

const STORAGE_KEY = 'renewvan-dashboard-settings-nav-style'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useSettingsNavStyle', () => {
  it('defaults to subpage', () => {
    const { result } = renderHook(() => useSettingsNavStyle())

    expect(result.current[0]).toBe('subpage')
  })

  it('persists a choice across remounts, under the key existing kiosks already use', () => {
    const first = renderHook(() => useSettingsNavStyle())
    act(() => first.result.current[1]('sheet'))
    first.unmount()

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('sheet')
    const second = renderHook(() => useSettingsNavStyle())
    expect(second.result.current[0]).toBe('sheet')
  })

  it('falls back to subpage for an unknown stored value', () => {
    window.localStorage.setItem(STORAGE_KEY, 'carousel')

    const { result } = renderHook(() => useSettingsNavStyle())

    expect(result.current[0]).toBe('subpage')
  })
})
