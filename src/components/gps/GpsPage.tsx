import 'leaflet/dist/leaflet.css'
import { Chip } from '@heroui/react'
import { MapPin, Map, Navigation, Satellite } from 'lucide-react'
import { MapContainer, TileLayer } from 'react-leaflet'
import '@/lib/leafletIconFix'
import { compassPoint, headingDeg } from '@/lib/vanMarker'
import { tiltReading } from '@/lib/tilt'
import { hasGpsFix, isCompleteGps, type Gps, type Tilt } from '@/types'
import { VanMarker } from './VanMarker'
import { useLocationName } from './useLocationName'

export interface GpsPageProps {
  gps: Record<string, Gps>
  /** Tilt records by id; the first one's pitch tilts the van on the map. */
  tilt?: Record<string, Partial<Tilt>>
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function EmptyPane({ title, description }: { title: string; description: string }) {
  return (
    <section
      data-testid="pane-gps"
      className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
    >
      <Map aria-hidden="true" className="text-muted size-5" />
      <h2 className="text-foreground text-lg font-semibold">{title}</h2>
      <p className="text-muted text-sm">{description}</p>
    </section>
  )
}

/**
 * Full-bleed OpenStreetMap centred on the hub's position, with the van drawn on it and a
 * fix / satellites / speed / heading readout over its bottom-left corner. The van faces the way
 * it is travelling (GPS course, only while moving) and pitches with the tilt device. The map is a
 * live view, not a navigator: it re-centres only when the page remounts.
 */
export function GpsPage({ gps, tilt = {} }: GpsPageProps) {
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
    />
  )
}

/**
 * The map and readout for a record that has a position. A component of its own because the place
 * name is a hook, which cannot sit after `GpsPage`'s early returns.
 */
function FixView({
  record,
  position,
  tilt,
}: {
  record: Gps
  position: [number, number]
  tilt: Record<string, Partial<Tilt>>
}) {
  const heading = headingDeg(record.course_deg, record.speed_kmh)
  // One tilt device per van; the first record decides.
  const { pitch } = tiltReading(Object.values(tilt)[0])
  const placeName = useLocationName(position[0], position[1])

  return (
    // `isolate`: Leaflet's panes and controls use z-index up to 1000, which
    // otherwise competes directly with unrelated page UI (the toast region) in
    // the root stacking context. Isolation caps every Leaflet z-index to this
    // subtree so the map can never paint over anything outside it.
    <section
      data-testid="pane-gps"
      className="relative isolate min-h-0 flex-1 overflow-hidden rounded-2xl"
    >
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
        <VanMarker position={position} heading={heading} pitch={pitch} />
      </MapContainer>
      {/* Above Leaflet's controls (z 1000) within this stacking context. */}
      <div
        data-testid="gps-readout"
        className="absolute bottom-4 left-4 z-1001 flex max-w-[calc(100%-2rem)] flex-col gap-1.5 rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-white backdrop-blur-md"
      >
        {placeName && (
          <span data-testid="gps-place" className="flex items-center gap-1.5 text-sm font-medium">
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
              data-testid="gps-heading"
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
