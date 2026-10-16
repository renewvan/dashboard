import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { usePowerLayout } from './usePowerLayout'

const STORAGE_KEY = 'renewvan-dashboard-power-layout'

beforeEach(() => {
  window.localStorage.clear()
})

describe('usePowerLayout', () => {
  it('defaults to tiles on a fresh kiosk', () => {
    const { result } = renderHook(() => usePowerLayout())
    expect(result.current[0]).toBe('tiles')
  })

  it('persists a chosen layout across remounts', () => {
    const first = renderHook(() => usePowerLayout())
    act(() => first.result.current[1]('flow'))
    first.unmount()

    const second = renderHook(() => usePowerLayout())
    expect(second.result.current[0]).toBe('flow')
  })

  it('reads an unknown stored value as the default, since localStorage outlives deploys', () => {
    window.localStorage.setItem(STORAGE_KEY, 'sankey')
    const { result } = renderHook(() => usePowerLayout())
    expect(result.current[0]).toBe('tiles')
  })
})
