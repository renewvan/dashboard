import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAlertsEnabled } from './useAlertsEnabled'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useAlertsEnabled', () => {
  it('defaults to on so a fresh kiosk never silently hides alerts', () => {
    const { result } = renderHook(() => useAlertsEnabled())
    expect(result.current[0]).toBe(true)
  })

  it('persists a disabled choice across remounts', () => {
    const first = renderHook(() => useAlertsEnabled())
    act(() => first.result.current[1](false))
    first.unmount()

    const second = renderHook(() => useAlertsEnabled())
    expect(second.result.current[0]).toBe(false)
  })
})
