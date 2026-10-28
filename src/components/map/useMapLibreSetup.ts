import { addProtocol, removeProtocol, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { Protocol } from 'pmtiles'
import { useEffect } from 'react'

/**
 * What MapLibre needs from the app before a map mounts, for as long as one is mounted.
 *
 * The worker: MapLibre parses tiles in a Web Worker it loads from a file of its own
 * (`maplibre-gl-worker.mjs`), found at runtime by URL. A bundler never sees that reference, so
 * without this the file is not in `dist/` and the map shows a blank background with "Worker failed
 * to load" in the console. Importing it with `?url` makes Vite emit it, hashed, and hand back where.
 *
 * The protocol: the `pmtiles://` scheme that reads the basemap archive. `addProtocol` is global to
 * the MapLibre module, so it is registered by the first map to mount and removed by the last to
 * unmount: the Map page and the Start card each mount one, and switching between them has one
 * leaving while the other arrives. Removing it on every unmount would strip it from the map still
 * there, which then fetches the raw `pmtiles://` URL ("CORS request not http") and shows
 * "Offline map unavailable".
 *
 * Both run in an effect, which is early enough: `<Map>` creates its map in an effect of its own,
 * after loading `maplibre-gl`, so the parent's effect has already run.
 */
let mounted = 0

export function useMapLibreSetup(): void {
  useEffect(() => {
    setWorkerUrl(workerUrl)
    if (mounted++ === 0) addProtocol('pmtiles', new Protocol().tile)
    return () => {
      if (--mounted === 0) removeProtocol('pmtiles')
    }
  }, [])
}
