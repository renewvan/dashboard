import { useStoredState } from '@/hooks/useStoredState'
import type { StartWidgetId } from '@/hooks/useStartLayout'

/** The Grid is this many columns wide; a tile is one to all of them. */
export const TILE_COLUMNS = [1, 2, 3, 4] as const
/** A grid row is 150px; a tile is one to three of them tall. */
export const TILE_ROWS = [1, 2, 3] as const

export type TileCols = (typeof TILE_COLUMNS)[number]
export type TileRows = (typeof TILE_ROWS)[number]

/**
 * What the Grid places: a widget each, except Energy, which is two tiles, Power and
 * Battery. (On a phone Energy is one card, a carousel of the two.)
 */
export const START_TILE_IDS = [
  'weather',
  'map',
  'power',
  'battery',
  'solar',
  'tilt',
  'fresh-water',
  'grey-water',
] as const

export type StartTileId = (typeof START_TILE_IDS)[number]

/** The tiles the Grid draws for a layout, in order: Energy becomes Power then Battery. */
export function tilesOfLayout(layout: readonly StartWidgetId[]): StartTileId[] {
  return layout.flatMap((id): StartTileId[] => (id === 'energy' ? ['power', 'battery'] : [id]))
}

/** How many cells of the Grid one tile takes. */
export interface TileSize {
  cols: TileCols
  rows: TileRows
}

/** The Grid as shipped: the Map, Power and Battery larger than the rest. */
export const DEFAULT_TILE_SIZES: Record<StartTileId, TileSize> = {
  weather: { cols: 1, rows: 1 },
  map: { cols: 2, rows: 2 },
  power: { cols: 1, rows: 2 },
  battery: { cols: 1, rows: 2 },
  solar: { cols: 1, rows: 1 },
  tilt: { cols: 1, rows: 1 },
  'fresh-water': { cols: 1, rows: 1 },
  'grey-water': { cols: 1, rows: 1 },
}

/** Only the sizes the user changed; a tile not listed keeps its shipped size. */
export type StartTiles = Partial<Record<StartTileId, TileSize>>

const STORAGE_KEY = 'renewvan-dashboard-start-tiles'

function isCols(value: unknown): value is TileCols {
  return TILE_COLUMNS.some((cols) => cols === value)
}

function isRows(value: unknown): value is TileRows {
  return TILE_ROWS.some((rows) => rows === value)
}

/**
 * The stored sizes: a JSON object of widget id to `{ cols, rows }`. An unknown tile (removed in a
 * later version) or a size outside the grid is dropped, so an old or edited value never breaks the
 * page; nothing stored, or something that is not an object, is no overrides.
 */
export function parseStartTiles(stored: string | null): StartTiles {
  if (stored === null) return {}
  try {
    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return {}
    const tiles: StartTiles = {}
    for (const id of START_TILE_IDS) {
      const size: unknown = (parsed as Record<string, unknown>)[id]
      if (typeof size !== 'object' || size === null) continue
      const { cols, rows } = size as Record<string, unknown>
      if (isCols(cols) && isRows(rows)) tiles[id] = { cols, rows }
    }
    return tiles
  } catch {
    return {}
  }
}

/** The size `id` is drawn at: the user's, else the shipped one. */
export function tileSizeOf(tiles: StartTiles, id: StartTileId): TileSize {
  return tiles[id] ?? DEFAULT_TILE_SIZES[id]
}

/** `tiles` with `id` at `size`; a size equal to the shipped one is no override, so it is dropped. */
export function withTileSize(tiles: StartTiles, id: StartTileId, size: TileSize): StartTiles {
  const { [id]: _previous, ...rest } = tiles
  const shipped = DEFAULT_TILE_SIZES[id]
  return size.cols === shipped.cols && size.rows === shipped.rows ? rest : { ...rest, [id]: size }
}

/**
 * The Grid's tile sizes. Kiosk-local with no bus topic, persisted like `useStartLayout`; the
 * order and which widgets show are `useStartLayout`'s.
 */
export function useStartTiles() {
  return useStoredState<StartTiles>(STORAGE_KEY, parseStartTiles, JSON.stringify)
}
