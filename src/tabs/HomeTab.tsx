import { Van } from 'lucide-react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { EmptyState } from '../components/EmptyState'
import { Card, CardContent } from '../components/ui/card'
import '../lib/leafletIconFix'
import { hasGpsFix, isCompleteGps, type Gps } from '../types'

export interface HomeTabProps {
  gps: Record<string, Gps>
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'

function GpsWidget({ gps }: { gps: Gps }) {
  if (!hasGpsFix(gps)) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
          <div className="text-muted-foreground text-sm">No GPS fix yet</div>
        </CardContent>
      </Card>
    )
  }
  const position: [number, number] = [gps.latitude as number, gps.longitude as number]

  return (
    <Card data-testid="gps-widget-a" className="h-full">
      <div className="relative isolate h-full w-full overflow-hidden rounded-lg">
        <MapContainer
          center={position}
          zoom={13}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
          attributionControl={false}
          className="h-full w-full"
        >
          <TileLayer attribution={OSM_ATTRIBUTION} url={OSM_URL} />
          <Marker position={position} />
        </MapContainer>
        <div
          className="absolute right-2 bottom-2 flex flex-col gap-1 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs text-white backdrop-blur-md"
          style={{ zIndex: 1001 }}
        >
          <span className="tabular-nums">
            {gps.latitude?.toFixed(4)}, {gps.longitude?.toFixed(4)}
          </span>
          {gps.speed_kmh !== undefined && (
            <span className="font-semibold tabular-nums">{gps.speed_kmh.toFixed(0)} km/h</span>
          )}
        </div>
      </div>
    </Card>
  )
}

export function HomeTab({ gps }: HomeTabProps) {
  const id = Object.keys(gps).find((key) => isCompleteGps(gps[key]))
  const record = id ? gps[id] : undefined

  if (!record) {
    return (
      <EmptyState
        icon={<Van />}
        title="No campervan data yet."
        description="Waiting for readings from the renewvan hub."
      />
    )
  }

  return (
    // Column 1 (Weather/Thermostat) and columns 2-4 (Map/Switches+Battery)
    // each need their own top:bottom ratio -- a single shared grid-rows-2
    // across the full width can't express that, which is why the old
    // version reached for ad hoc %/absolute hacks per widget, each fighting
    // the shared gap-2 rhythm differently. Two independent nested grids
    // (fr-ratio rows, no percent) solve both at once: every gap in the
    // whole layout is the exact same `gap-2` (matches TanksTab's gutter),
    // and each column's own two rows size off ITS OWN fr ratio instead of
    // the other column's.
    <div className="grid h-full grid-cols-4 gap-2 overflow-hidden p-0">
      {/* Column 1: Weather (2fr) / Thermostat (3fr) */}
      <div className="col-span-1 grid min-h-0 grid-rows-[2fr_3fr] gap-2">
        <div className="bg-card/40 min-h-0 rounded-2xl border border-white/10 p-4 backdrop-blur-md">
          <div className="text-muted-foreground text-xs">Weather</div>
        </div>
        <div className="bg-card/40 min-h-0 rounded-2xl border border-white/10 p-4 backdrop-blur-md">
          <div className="text-muted-foreground text-xs">Thermostat</div>
        </div>
      </div>
      {/* Columns 2-4: GPS Map (6fr) / Switches (2fr) + Battery (1fr) row (5fr) */}
      <div className="col-span-3 grid min-h-0 grid-rows-[6fr_5fr] gap-2">
        <div className="min-h-0">
          <GpsWidget gps={record} />
        </div>
        <div className="grid min-h-0 grid-cols-2 gap-2">
          <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-2">
            <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-4 backdrop-blur-md">
              <div className="text-muted-foreground text-xs">Switches</div>
            </div>
            <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-4 backdrop-blur-md">
              <div className="text-muted-foreground text-xs">Switches</div>
            </div>
            <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-4 backdrop-blur-md">
              <div className="text-muted-foreground text-xs">Switches</div>
            </div>
            <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-4 backdrop-blur-md">
              <div className="text-muted-foreground text-xs">Switches</div>
            </div>
          </div>
          <div className="min-h-0">
            <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-4 backdrop-blur-md">
              <div className="text-muted-foreground text-xs">Battery</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
