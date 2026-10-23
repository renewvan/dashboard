import { Map } from 'lucide-react'
import { MAP_GLASS } from './mapGlass'

/**
 * Says why the map behind it is empty when the basemap file could not be read (a fresh install has
 * none yet). A notice, not a pane: the empty map and the van stay in view. It has no controls and
 * lets pointers through to the map. Top-left, the one corner the readout (bottom-left), the zoom
 * buttons (top-right) and the attribution (bottom-right) leave free; `max-w` keeps it clear of
 * the zoom buttons on a narrow screen. `role="status"` so a screen reader hears it appear.
 */
export function BasemapNotice() {
  return (
    <div
      role="status"
      data-testid="map-notice"
      className={`pointer-events-none absolute top-4 left-4 z-10 flex max-w-[calc(100%-6.5rem)] items-start gap-2.5 px-4 py-2.5 ${MAP_GLASS}`}
    >
      <Map aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">Offline map unavailable</span>
        <span className="text-xs text-white/70">
          Can't read maps/basemap.pmtiles. See docs/offline-map.md.
        </span>
      </div>
    </div>
  )
}
