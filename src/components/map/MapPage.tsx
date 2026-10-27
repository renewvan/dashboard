import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Map as MapView, useMap } from 'react-map-gl/maplibre'
import { useIsMobile } from '@/hooks/use-media-query'
import { basemapStyle } from '@/lib/mapStyle'
import { headingDeg } from '@/lib/vanMarker'
import { tiltReading } from '@/lib/tilt'
import { hasGpsFix, isCompleteGps, type Gps, type Tilt } from '@/types'
import { BasemapNotice } from './BasemapNotice'
import { GpsStatusNotice } from './GpsStatusNotice'
import { readLastPosition, useRememberPosition, type LatLon } from './useLastPosition'
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
  /**
   * `page` is the full-bleed Map page. `card` is the Start page's card: it fills the box its parent
   * gives it, with the zoom buttons tucked into the corner. The readout and attribution toggle are
   * the same as the page's.
   */
  variant?: 'page' | 'card'
  /** The van marker's body colour; the theme accent when empty. */
  vanColor?: string
}

/** Close enough to read streets, for a van that has a position. */
const ZOOM = 15
/**
 * DEBUG: draw the van on the opening view's centre while there is no position, so the marker can be
 * seen without a GPS fix. Set to `false` (or delete it and the branch that reads it) to draw the van
 * only on a real fix.
 */
export const SHOW_VAN_WITHOUT_FIX = false

/**
 * Where the map opens for a van that has never had a position: Freiburg Münster, the middle of the
 * region the basemap extract currently covers.
 */
const DEFAULT_VIEW = { longitude: 7.8528, latitude: 47.9958, zoom: ZOOM }

/**
 * Full-bleed MapLibre map, always drawn: with no hub data or no GPS fix it opens on the van's last
 * known position (or Freiburg Münster if it never had one) with a status notice instead of the van
 * and readout. With a fix it is centred on the hub's position, with the van drawn on it and a
 * fix / satellites / speed / heading readout over its bottom-left corner. The van faces the way
 * it is travelling (GPS course, only while moving) and pitches with the tilt device. The map is a
 * live view, not a navigator: it re-centres only when the page remounts, or once when the first
 * fix arrives on a map that opened without one.
 */
export function MapPage({
  gps,
  tilt = {},
  isDark = true,
  variant = 'page',
  vanColor,
}: MapPageProps) {
  // MQTT builds a record up one property per retained message; skip any id whose
  // unconditional fields haven't arrived (see `isCompleteGps`). There is a single
  // GPS device per hub, so the first complete id decides.
  const id = Object.keys(gps).find((key) => isCompleteGps(gps[key]))
  const record = id ? gps[id] : undefined
  // `no_fix` is a complete, valid state with no coordinates to plot.
  const position: LatLon | null =
    record && hasGpsFix(record) ? [record.latitude as number, record.longitude as number] : null

  return (
    <MapScene
      record={record}
      position={position}
      tilt={tilt}
      isDark={isDark}
      variant={variant}
      vanColor={vanColor}
    />
  )
}

/** Moves the map to the first fix when it opened without one. Renders nothing; lives inside `<Map>`. */
function RecentreOnFirstFix({
  position,
  openedWithPosition,
}: {
  position: LatLon | null
  openedWithPosition: boolean
}) {
  const { current: map } = useMap()
  const done = useRef(openedWithPosition)
  const latitude = position?.[0]
  const longitude = position?.[1]
  useEffect(() => {
    if (done.current || !map || latitude === undefined || longitude === undefined) return
    done.current = true
    map.jumpTo({ center: [longitude, latitude], zoom: ZOOM })
  }, [map, latitude, longitude])
  return null
}

function MapScene({
  record,
  position,
  tilt,
  isDark,
  variant,
  vanColor,
}: {
  record: Gps | undefined
  position: LatLon | null
  tilt: Record<string, Partial<Tilt>>
  isDark: boolean
  variant: 'page' | 'card'
  vanColor?: string
}) {
  const isCard = variant === 'card'
  const heading = record ? headingDeg(record.course_deg, record.speed_kmh) : null
  // One tilt device per van; the first record decides.
  const { pitch } = tiltReading(Object.values(tilt)[0])
  const latitude = position?.[0]
  const longitude = position?.[1]
  const placeName = useLocationName(latitude, longitude)
  useRememberPosition(position)
  // Read once, when the page mounts: `initialViewState` centres only once, and the stored value
  // changes underneath as fixes arrive.
  const [initialView] = useState(() => {
    if (position) return { longitude: position[1], latitude: position[0], zoom: ZOOM }
    const last = readLastPosition()
    return last ? { longitude: last[1], latitude: last[0], zoom: ZOOM } : DEFAULT_VIEW
  })
  const [openedWithPosition] = useState(position !== null)
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
      data-testid={isCard ? 'map-card' : 'pane-map'}
      className={
        isCard
          ? 'relative isolate size-full overflow-hidden rounded-[inherit]'
          : 'relative isolate min-h-0 flex-1 overflow-hidden'
      }
    >
      {/* `initialViewState` centres once: the map is a live view, so the van moves on a still map
          and the view only re-centres when the page remounts (or `RecentreOnFirstFix`). */}
      <MapView
        initialViewState={initialView}
        mapStyle={style}
        onError={onError}
        onSourceData={onSourceData}
        scrollZoom={false}
        // MapLibre's own (i) on every size: `compact` keeps the round button at any width. It would
        // start open (the credit's text beside the button), so `useAttributionOpen` closes it.
        attributionControl={{ compact: true }}
        style={{ width: '100%', height: '100%' }}
      >
        {longitude !== undefined && latitude !== undefined ? (
          <VanMarker
            longitude={longitude}
            latitude={latitude}
            heading={heading}
            pitch={pitch}
            color={vanColor}
          />
        ) : (
          SHOW_VAN_WITHOUT_FIX && (
            <VanMarker
              longitude={initialView.longitude}
              latitude={initialView.latitude}
              heading={heading}
              pitch={pitch}
              color={vanColor}
            />
          )
        )}
        <RecentreOnFirstFix position={position} openedWithPosition={openedWithPosition} />
        <ZoomControls className={isCard ? 'top-3 right-3' : undefined} />
      </MapView>
      {unavailable && <BasemapNotice />}
      {/* Bottom-left, where it always was. MapLibre's (i) is bottom-right; on a phone, opening it
          would run its credit under a whole readout, so the readout shrinks to its GPS badge then. */}
      {record && position ? (
        <MapReadout
          record={record}
          heading={heading}
          placeName={placeName ?? undefined}
          compact={isMobile && creditsOpen}
          className="absolute bottom-2.5 left-2.5"
        />
      ) : (
        <GpsStatusNotice
          satellites={record?.satellites_in_use}
          compact={isMobile && creditsOpen}
          className="absolute bottom-2.5 left-2.5"
        />
      )}
    </section>
  )
}
