import { useCallback, useState } from 'react'
import type { MapSourceDataEvent } from 'react-map-gl/maplibre'
import { BASEMAP_SOURCE_ID } from '@/lib/mapStyle'

/**
 * The fields of MapLibre's `error` event this hook reads. react-map-gl types the event as just
 * `{ error }`, but MapLibre adds the id of the source an error came from, and `tile` when it
 * came from loading one tile of that source.
 */
export interface MapErrorEvent {
  error: Error
  sourceId?: string
  tile?: unknown
}

/**
 * Tracks whether the Map page's basemap FILE is unavailable, from the map's own events: pass
 * `onError` and `onSourceData` to `<Map>`. It clears again when the source later loads, so a file
 * that becomes readable takes the notice with it. MapLibre does not retry a source that failed
 * to load by itself, so that happens when the map loads the source again (the page remounts,
 * for one), not in the background.
 *
 * Passing `onError` makes react-map-gl stop logging map errors, so they are logged here instead.
 */
export function useBasemapUnavailable() {
  const [unavailable, setUnavailable] = useState(false)

  const onError = useCallback((e: MapErrorEvent) => {
    console.error(e.error)
    // The file is unreadable when the basemap source fails as a whole (a source-level error, no
    // `tile`): pmtiles could not read the archive's header, because the file is missing (404), is
    // not a PMTiles archive (the SPA's index.html answering 200, an empty file), or the request
    // failed. A van outside the extract is a different thing: the header loads, and a tile the
    // archive does not hold comes back empty, not as an error. A tile that fails to load has
    // `tile` set and is no verdict on the file.
    if (e.sourceId === BASEMAP_SOURCE_ID && e.tile === undefined) setUnavailable(true)
  }, [])

  // `content` is the source reporting that its TileJSON, read from the file's header, loaded. A
  // source being removed from a style reports `metadata` instead, which is not it.
  const onSourceData = useCallback((e: Pick<MapSourceDataEvent, 'sourceId' | 'sourceDataType'>) => {
    if (e.sourceId === BASEMAP_SOURCE_ID && e.sourceDataType === 'content') setUnavailable(false)
  }, [])

  return { unavailable, onError, onSourceData }
}
