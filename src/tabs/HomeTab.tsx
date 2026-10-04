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

function GpsWidgetVariantA({ gps }: { gps: Gps }) {
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
    <Card data-testid="gps-widget-a">
      <CardContent className="flex flex-col gap-2 p-2">
        {/* isolate: Leaflet's internal panes/marker z-index (up to 600
            here, since zoomControl/attributionControl are both off)
            would otherwise compare in the root stacking context against
            unrelated page UI -- see GpsTab.tsx's identical comment for the
            full explanation. */}
        <div className="isolate h-36 w-full overflow-hidden rounded-lg">
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
        </div>
        <div className="flex items-center justify-between px-1 pb-1">
          <span className="text-muted-foreground text-xs tabular-nums">
            {gps.latitude?.toFixed(4)}, {gps.longitude?.toFixed(4)}
          </span>
          {gps.speed_kmh !== undefined && (
            <span className="text-sm font-semibold tabular-nums">
              {gps.speed_kmh.toFixed(0)} km/h
            </span>
          )}
        </div>
      </CardContent>
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
    <div className="flex h-full flex-col gap-3 p-3">
      {/* Row 1: Weather (1/3) | GPS Map (2/3) */}
      <div className="flex gap-3">
        <div className="w-1/3 min-w-0">
          {/* Weather widget placeholder */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-white backdrop-blur-md">
            <div className="text-xs text-white/60">Weather</div>
            <div className="mt-2 text-sm">(placeholder)</div>
          </div>
        </div>
        <div className="w-2/3 min-w-0">
          <GpsWidgetVariantA gps={record} />
        </div>
      </div>
      {/* Row 2: Thermostat (1/3) | Switches (2/3) */}
      <div className="flex gap-3">
        <div className="w-1/3 min-w-0">
          {/* Thermostat widget placeholder */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-white backdrop-blur-md">
            <div className="text-xs text-white/60">Thermostat</div>
            <div className="mt-2 text-sm">(placeholder)</div>
          </div>
        </div>
        <div className="w-2/3 min-w-0">
          {/* Switches placeholder */}
          <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-white backdrop-blur-md">
            <div className="text-xs text-white/60">Switches</div>
            <div className="mt-2 text-sm">(placeholder)</div>
          </div>
        </div>
      </div>
    </div>
  )
}
