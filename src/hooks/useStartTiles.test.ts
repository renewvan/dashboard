import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import {
  DEFAULT_TILE_SIZES,
  parseStartTiles,
  tilesOfLayout,
  tileSizeOf,
  useStartTiles,
  withTileSize,
} from './useStartTiles'

const STORAGE_KEY = 'renewvan-dashboard-start-tiles'

beforeEach(() => {
  window.localStorage.clear()
})

describe('useStartTiles', () => {
  it('has no overrides on a fresh kiosk, so every widget keeps its shipped size', () => {
    const { result } = renderHook(() => useStartTiles())
    expect(result.current[0]).toEqual({})
    expect(tileSizeOf(result.current[0], 'battery')).toEqual(DEFAULT_TILE_SIZES.battery)
  })

  it('persists a size across remounts', () => {
    const first = renderHook(() => useStartTiles())
    act(() => first.result.current[1]({ battery: { cols: 1, rows: 1 } }))
    first.unmount()

    const second = renderHook(() => useStartTiles())
    expect(tileSizeOf(second.result.current[0], 'battery')).toEqual({ cols: 1, rows: 1 })
  })
})

describe('parseStartTiles', () => {
  it('drops widgets it does not know and sizes outside the grid, since localStorage outlives deploys', () => {
    const stored = JSON.stringify({
      map: { cols: 4, rows: 3 },
      gauge: { cols: 1, rows: 1 },
      battery: { cols: 5, rows: 1 },
      tilt: { cols: 2 },
      solar: 'big',
    })
    expect(parseStartTiles(stored)).toEqual({ map: { cols: 4, rows: 3 } })
  })

  it('reads nothing, junk, or a list as no overrides', () => {
    expect(parseStartTiles(null)).toEqual({})
    expect(parseStartTiles('not json')).toEqual({})
    expect(parseStartTiles('[1,2]')).toEqual({})
    expect(parseStartTiles('null')).toEqual({})
  })

  it('is read back from the key the hook stores under', () => {
    window.localStorage.setItem(STORAGE_KEY, '{"tilt":{"cols":2,"rows":1}}')
    const { result } = renderHook(() => useStartTiles())
    expect(result.current[0]).toEqual({ tilt: { cols: 2, rows: 1 } })
  })
})

describe('withTileSize', () => {
  it('adds an override and replaces an earlier one', () => {
    const one = withTileSize({}, 'tilt', { cols: 2, rows: 1 })
    expect(one).toEqual({ tilt: { cols: 2, rows: 1 } })
    expect(withTileSize(one, 'tilt', { cols: 3, rows: 1 })).toEqual({ tilt: { cols: 3, rows: 1 } })
  })

  it('drops the override when the size is the shipped one', () => {
    const tiles = { battery: { cols: 1, rows: 1 } } as const
    expect(withTileSize(tiles, 'battery', DEFAULT_TILE_SIZES.battery)).toEqual({})
  })
})

describe('tilesOfLayout', () => {
  it('turns Energy into Power then Battery in its place, and leaves the rest alone', () => {
    expect(tilesOfLayout(['weather', 'energy', 'tilt'])).toEqual([
      'weather',
      'power',
      'battery',
      'tilt',
    ])
    expect(tilesOfLayout([])).toEqual([])
  })
})
