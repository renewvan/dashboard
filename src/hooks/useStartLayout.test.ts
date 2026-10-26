import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  DEFAULT_START_LAYOUT,
  START_WIDGET_IDS,
  moveWidget,
  reorderWidget,
  useStartLayout,
} from './useStartLayout'

const STORAGE_KEY = 'renewvan-dashboard-start-layout'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useStartLayout', () => {
  it('shows every widget, in the shipped order, on a fresh kiosk', () => {
    const { result } = renderHook(() => useStartLayout())
    expect(result.current[0]).toEqual(DEFAULT_START_LAYOUT)
    expect(result.current[0]).toEqual(START_WIDGET_IDS)
  })

  it('persists a removed and rearranged layout across remounts', () => {
    const first = renderHook(() => useStartLayout())
    act(() => first.result.current[1](['tilt', 'weather']))
    first.unmount()

    const second = renderHook(() => useStartLayout())
    expect(second.result.current[0]).toEqual(['tilt', 'weather'])
  })

  it('keeps an empty layout: removing every widget is a choice, not a reset', () => {
    window.localStorage.setItem(STORAGE_KEY, '[]')
    const { result } = renderHook(() => useStartLayout())
    expect(result.current[0]).toEqual([])
  })

  it('drops ids it does not know and repeats, since localStorage outlives deploys', () => {
    window.localStorage.setItem(STORAGE_KEY, '["map","gauge","map",7,"energy"]')
    const { result } = renderHook(() => useStartLayout())
    expect(result.current[0]).toEqual(['map', 'energy'])
  })

  it('moves a widget one place, and stops at either end', () => {
    const layout = ['weather', 'tilt', 'map'] as const
    expect(moveWidget(layout, 'tilt', -1)).toEqual(['tilt', 'weather', 'map'])
    expect(moveWidget(layout, 'tilt', 1)).toEqual(['weather', 'map', 'tilt'])
    expect(moveWidget(layout, 'weather', -1)).toBe(layout)
    expect(moveWidget(layout, 'map', 1)).toBe(layout)
    expect(moveWidget(layout, 'energy', 1)).toBe(layout)
  })

  it('reorders a widget to any slot, and ignores a slot that does not exist', () => {
    const layout = ['weather', 'map', 'tilt', 'solar'] as const
    expect(reorderWidget(layout, 0, 2)).toEqual(['map', 'tilt', 'weather', 'solar'])
    expect(reorderWidget(layout, 3, 0)).toEqual(['solar', 'weather', 'map', 'tilt'])
    expect(reorderWidget(layout, 1, 1)).toBe(layout)
    expect(reorderWidget(layout, 1, 4)).toBe(layout)
    expect(reorderWidget(layout, -1, 2)).toBe(layout)
  })

  it.each(['not json', '{"map":true}', '"map"'])('reads %s as the default layout', (stored) => {
    window.localStorage.setItem(STORAGE_KEY, stored)
    const { result } = renderHook(() => useStartLayout())
    expect(result.current[0]).toEqual(DEFAULT_START_LAYOUT)
  })
})
