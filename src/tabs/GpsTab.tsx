import 'leaflet/dist/leaflet.css'
import { Map, Satellite } from 'lucide-react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { EmptyState } from '../components/EmptyState'
import { Badge } from '../components/ui/badge'
import '../lib/leafletIconFix'
import { hasGpsFix, isCompleteGps, type Gps } from '../types'

export interface GpsTabProps {
  gps: Record<string, Gps>
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

function NoFixState({ gps }: { gps: Gps }) {
  return (
    <EmptyState
      icon={<Map />}
      title="No GPS fix yet"
      description={`Tracking ${gps.satellites_in_use} satellite(s) — waiting for a fix.`}
    />
  )
}

export function GpsTab({ gps }: GpsTabProps) {
  // Single GPS node per hub (compose GPS_ID) — first id decides; none
  // yet means no data has arrived, not an error.
  const id = Object.keys(gps).find((key) => isCompleteGps(gps[key]))
  const record = id ? gps[id] : undefined

  if (!record) {
    return (
      <EmptyState
        icon={<Map />}
        title="No GPS data yet."
        description="Waiting for readings from the renewvan hub."
      />
    )
  }

  if (!hasGpsFix(record)) {
    return <NoFixState gps={record} />
  }

  const position: [number, number] = [record.latitude as number, record.longitude as number]

  return (
    // isolate: Leaflet's own controls/panes use z-index up to 1000
    // (.leaflet-top/.leaflet-bottom), which otherwise compares directly
    // against unrelated page UI (e.g. the alert toast's z-60 viewport)
    // in the root stacking context and wins -- isolation: isolate caps
    // every Leaflet z-index to this subtree so it can never paint over
    // anything outside the map.
    <div className="relative isolate h-full w-full overflow-hidden rounded-2xl">
      <MapContainer center={position} zoom={15} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
        <Marker position={position} />
      </MapContainer>
      <div
        className="absolute bottom-4 left-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/60 px-4 py-2.5 text-white backdrop-blur-md"
        style={{ zIndex: 1001 }}
      >
        <Badge variant="success">{record.fix_quality.toUpperCase()}</Badge>
        <span className="flex items-center gap-1 text-sm">
          <Satellite className="size-4" />
          {record.satellites_in_use}
        </span>
        {record.speed_kmh !== undefined && (
          <span className="text-sm font-semibold tabular-nums">
            {record.speed_kmh.toFixed(0)} km/h
          </span>
        )}
      </div>
    </div>
  )
}
