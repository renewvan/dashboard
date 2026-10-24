import 'maplibre-gl/dist/maplibre-gl.css'
import { Chip } from '@heroui/react'
import { MapPin, Map, Navigation, Satellite } from 'lucide-react'
import { useMemo } from 'react'
import { Map as MapView } from 'react-map-gl/maplibre'
import { basemapStyle } from '@/lib/mapStyle'
import { compassPoint, headingDeg } from '@/lib/vanMarker'
import { tiltReading } from '@/lib/tilt'
import { hasGpsFix, isCompleteGps, type Gps, type Tilt } from '@/types'
import { BasemapNotice } from './BasemapNotice'
import { VanMarker } from './VanMarker'
import { useLocationName } from './useLocationName'
import { useBasemapUnavailable } from './useBasemapUnavailable'
import { useMapLibreSetup } from './useMapLibreSetup'
import { ZoomControls } from './ZoomControls'
import { MAP_GLASS } from './mapGlass'

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

  return (
    // `isolate`: MapLibre's controls and attribution carry their own z-index, which otherwise
    // competes with unrelated page UI (the toast region) in the root stacking context. Isolation
    // caps them to this subtree so the map can never paint over anything outside it.
    <section data-testid="pane-map" className="relative isolate min-h-0 flex-1 overflow-hidden">
      {/* `initialViewState` centres once: the map is a live view, so the van moves on a still map
          and the view only re-centres when the page remounts. */}
      <MapView
        initialViewState={{ longitude, latitude, zoom: ZOOM }}
        mapStyle={style}
        onError={onError}
        onSourceData={onSourceData}
        scrollZoom={false}
        style={{ width: '100%', height: '100%' }}
      >
        <VanMarker longitude={longitude} latitude={latitude} heading={heading} pitch={pitch} />
        <ZoomControls />
      </MapView>
      {unavailable && <BasemapNotice />}
      {/* Above the map's own controls within this stacking context, and above the attribution's
          row (its licence text must stay fully visible: it is 24px tall, 10px off the bottom, and
          grows leftward, so at a phone's width it would run under a readout sitting beside it). */}
      <div
        data-testid="map-readout"
        className={`absolute bottom-12 left-4 z-10 flex max-w-[calc(100%-2rem)] flex-col gap-1.5 px-4 py-2.5 ${MAP_GLASS}`}
      >
        {placeName && (
          <span data-testid="map-place" className="flex items-center gap-1.5 text-sm font-medium">
            <MapPin aria-hidden="true" className="size-4 shrink-0" />
            <span className="line-clamp-2">{placeName}</span>
          </span>
        )}
        <div className="flex items-center gap-3">
          <Chip size="sm" variant="primary" color="success">
            {record.fix_quality.toUpperCase()}
          </Chip>
          <span className="flex items-center gap-1 text-sm">
            <Satellite aria-hidden="true" className="size-4" />
            <span aria-label="Satellites in use">{record.satellites_in_use}</span>
          </span>
          {record.speed_kmh !== undefined && (
            <span className="text-sm font-semibold tabular-nums">
              {record.speed_kmh.toFixed(0)} km/h
            </span>
          )}
          {heading !== null && (
            <span
              data-testid="map-heading"
              className="flex items-center gap-1 text-sm font-semibold tabular-nums"
            >
              <Navigation
                aria-hidden="true"
                className="size-4"
                style={{ transform: `rotate(${heading - 45}deg)` }}
              />
              {compassPoint(heading)} {heading.toFixed(0)}°
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
