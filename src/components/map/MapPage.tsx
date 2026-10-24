import 'maplibre-gl/dist/maplibre-gl.css'
import { Map } from 'lucide-react'
import { useMemo, useRef } from 'react'
import { Map as MapView } from 'react-map-gl/maplibre'
import { useIsMobile } from '@/hooks/use-media-query'
import { basemapStyle } from '@/lib/mapStyle'
import { headingDeg } from '@/lib/vanMarker'
import { tiltReading } from '@/lib/tilt'
import { hasGpsFix, isCompleteGps, type Gps, type Tilt } from '@/types'
import { BasemapNotice } from './BasemapNotice'
import { useAttributionOpen } from './useAttributionOpen'
import { MapReadout } from './MapReadout'
import { VanMarker } from './VanMarker'
import { useLocationName } from './useLocationName'
import { useBasemapUnavailable } from './useBasemapUnavailable'
import { useMapLibreSetup } from './useMapLibreSetup'
import { ZoomControls } from './ZoomControls'

export interface MapPageProps {
  gps: Record<string, Gps>
  /** Tilt records by id; the first one's pitch tilts the van on the map. */
  tilt?: Record<string, Partial<Tilt>>
  /** The app's theme: a dark app draws the dark map, a light one the light map. Dark is the default. */
  isDark?: boolean
}

const ZOOM = 15

function EmptyPane({ title, description }: { title: string; description: string }) {
  return (
    <section
      data-testid="pane-map"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <Map aria-hidden="true" className="text-muted size-5" />
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      <p className="text-muted text-sm">{description}</p>
    </section>
  )
}

/**
 * Full-bleed MapLibre map centred on the hub's position, with the van drawn on it and a
 * fix / satellites / speed / heading readout over its bottom-left corner. The van faces the way
 * it is travelling (GPS course, only while moving) and pitches with the tilt device. The map is a
 * live view, not a navigator: it re-centres only when the page remounts.
 */
export function MapPage({ gps, tilt = {}, isDark = true }: MapPageProps) {
  // MQTT builds a record up one property per retained message; skip any id whose
  // unconditional fields haven't arrived (see `isCompleteGps`). There is a single
  // GPS device per hub, so the first complete id decides.
  const id = Object.keys(gps).find((key) => isCompleteGps(gps[key]))
  const record = id ? gps[id] : undefined

  if (!record) {
    return (
      <EmptyPane
        title="No GPS data yet."
        description="Waiting for readings from the renewvan hub."
      />
    )
  }

  // `no_fix` is a complete, valid state with no coordinates to plot.
  if (!hasGpsFix(record)) {
    return (
      <EmptyPane
        title="No GPS fix yet"
        description={`Tracking ${record.satellites_in_use} satellite(s) — waiting for a fix.`}
      />
    )
  }

  return (
    <FixView
      record={record}
      position={[record.latitude as number, record.longitude as number]}
      tilt={tilt}
      isDark={isDark}
    />
  )
}

/**
 * The map and readout for a record that has a position. A component of its own because the place
 * name is a hook, which cannot sit after `MapPage`'s early returns.
 */
function FixView({
  record,
  position,
  tilt,
  isDark,
}: {
  record: Gps
  position: [number, number]
  tilt: Record<string, Partial<Tilt>>
  isDark: boolean
}) {
  const heading = headingDeg(record.course_deg, record.speed_kmh)
  // One tilt device per van; the first record decides.
  const { pitch } = tiltReading(Object.values(tilt)[0])
  const [latitude, longitude] = position
  const placeName = useLocationName(latitude, longitude)
  // The basemap is the dashboard's own origin (offline), so the style needs the page's origin. It
  // is memoised: built per render, MapLibre would reload the style on every GPS message. It
  // changes only with the theme, which is the one time the map should repaint in other colours.
  const style = useMemo(
    () => basemapStyle(window.location.origin, isDark ? 'dark' : 'light'),
    [isDark],
  )
  useMapLibreSetup()
  const { unavailable, onError, onSourceData } = useBasemapUnavailable()
  const isMobile = useIsMobile()
  const section = useRef<HTMLElement>(null)
  // Whether MapLibre's (i) is open: its credit then takes room beside the readout.
  const creditsOpen = useAttributionOpen(section)

  return (
    // `isolate`: MapLibre's controls and attribution carry their own z-index, which otherwise
    // competes with unrelated page UI (the toast region) in the root stacking context. Isolation
    // caps them to this subtree so the map can never paint over anything outside it.
    <section
      ref={section}
      data-testid="pane-map"
      className="relative isolate min-h-0 flex-1 overflow-hidden"
    >
      {/* `initialViewState` centres once: the map is a live view, so the van moves on a still map
          and the view only re-centres when the page remounts. */}
      <MapView
        initialViewState={{ longitude, latitude, zoom: ZOOM }}
        mapStyle={style}
        onError={onError}
        onSourceData={onSourceData}
        scrollZoom={false}
        // MapLibre's own (i) on every size: `compact` keeps the round button at any width. It would
        // start open (the credit's text beside the button), so `useAttributionOpen` closes it.
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <VanMarker longitude={longitude} latitude={latitude} heading={heading} pitch={pitch} />
        <ZoomControls />
      </MapView>
      {unavailable && <BasemapNotice />}
      {/* Bottom-left, where it always was. MapLibre's (i) is bottom-right; on a phone, opening it
          would run its credit under a whole readout, so the readout shrinks to its GPS badge then. */}
      <MapReadout
        record={record}
        heading={heading}
        placeName={placeName ?? undefined}
        compact={isMobile && creditsOpen}
        className="absolute bottom-2.5 left-2.5"
      />
    </section>
  )
}
