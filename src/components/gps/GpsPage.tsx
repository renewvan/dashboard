import 'leaflet/dist/leaflet.css'
import { Chip } from '@heroui/react'
import { Map, Satellite } from 'lucide-react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import '@/lib/leafletIconFix'
import { hasGpsFix, isCompleteGps, type Gps } from '@/types'

export interface GpsPageProps {
  gps: Record<string, Gps>
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
 * Full-bleed OpenStreetMap centred on the hub's position, with a marker and a
 * fix / satellites / speed readout over its bottom-left corner. The map is a
 * live view, not a navigator: it re-centres only when the page remounts.
 */
export function GpsPage({ gps }: GpsPageProps) {
  // MQTT builds a record up one property per retained message; skip any id whose
  // unconditional fields haven't arrived (see `isCompleteGps`). There is a single
  // GPS node per hub, so the first complete id decides.
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

  const position: [number, number] = [record.latitude as number, record.longitude as number]

  return (
    // `isolate`: Leaflet's panes and controls use z-index up to 1000, which
    // otherwise competes directly with unrelated page UI (the toast region) in
    // the root stacking context. Isolation caps every Leaflet z-index to this
    // subtree so the map can never paint over anything outside it.
    <section data-testid="pane-gps" className="flex min-h-0 flex-1 flex-col px-4 pb-4">
      <div className="relative isolate min-h-0 flex-1 overflow-hidden rounded-2xl">
        <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="h-full w-full">
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
          <Marker position={position} />
        </MapContainer>
        {/* Above Leaflet's controls (z 1000) within this stacking context. */}
        <div
          data-testid="gps-readout"
          className="absolute bottom-4 left-4 z-1001 flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-white backdrop-blur-md"
        >
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
        </div>
      </div>
    </section>
  )
}
