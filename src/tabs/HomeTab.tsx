import { Van } from 'lucide-react'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { useEffect, useState } from 'react'
import { EmptyState } from '../components/EmptyState'
import { Card, CardContent } from '../components/ui/card'
import '../lib/leafletIconFix'
import { hasGpsFix, isCompleteGps, type Gps, type TemperatureSensor } from '../types'
import { WeatherWidget } from '../components/widgets/WeatherWidget'

export interface HomeTabProps {
  gps: Record<string, Gps>
  temperatures: Record<string, Partial<TemperatureSensor>>
}

const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; OpenStreetMap contributors'

function GpsWidget({ gps }: { gps: Gps }) {
  const [locationName, setLocationName] = useState<string | null>(null)

  useEffect(() => {
    if (!hasGpsFix(gps)) return
    const lat = gps.latitude as number
    const lon = gps.longitude as number

    // Reverse geocode coordinates to location name
    fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
      .then((res) => res.json())
      .then((data) => {
        const name =
          data.address?.village || data.address?.town || data.address?.city || data.display_name
        setLocationName(name || null)
      })
      .catch(() => setLocationName(null))
  }, [gps.latitude, gps.longitude])

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
      <div className="relative isolate h-full w-full overflow-hidden rounded-lg [&_.leaflet-bar_a]:flex [&_.leaflet-bar_a]:size-11 [&_.leaflet-bar_a]:items-center [&_.leaflet-bar_a]:justify-center [&_.leaflet-bar_a]:text-xl">
        <MapContainer
          center={position}
          zoom={13}
          zoomControl
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
          {locationName && <span className="line-clamp-2">{locationName}</span>}
          {gps.speed_kmh !== undefined && (
            <span className="font-semibold tabular-nums">{gps.speed_kmh.toFixed(0)} km/h</span>
          )}
        </div>
      </div>
    </Card>
  )
}

export function HomeTab({ gps, temperatures }: HomeTabProps) {
  const id = Object.keys(gps).find((key) => isCompleteGps(gps[key]))
  const record = id ? gps[id] : undefined

  // Temperature probes alone are enough to show the Home grid: a van with no
  // GPS module (or no fix yet) still has indoor/outdoor readings to display,
  // and the weather widget already falls back to a default location.
  if (!record && Object.keys(temperatures).length === 0) {
    return (
      <EmptyState
        icon={<Van />}
        title="No campervan data yet."
        description="Waiting for readings from the renewvan hub."
      />
    )
  }

  return (
    <div className="grid h-full grid-cols-[1.1fr_1fr_1fr] grid-rows-2 gap-2 overflow-hidden p-0">
      <div className="row-span-2 flex min-h-0 flex-col gap-2">
        <div className="bg-card/40 min-h-0 flex-1 rounded-2xl border border-white/10 p-2 backdrop-blur-md">
          <WeatherWidget
            lat={record?.latitude}
            lon={record?.longitude}
            temperatures={temperatures}
          />
        </div>
        <div className="bg-card/40 h-3/5 w-full shrink-0 rounded-2xl border border-white/10 p-2 backdrop-blur-md">
          <div className="text-muted-foreground text-xs">Thermostat</div>
        </div>
      </div>
      <div className="col-span-2 min-h-0">
        {record ? (
          <GpsWidget gps={record} />
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="text-muted-foreground text-sm">No GPS fix yet</div>
            </CardContent>
          </Card>
        )}
      </div>
      <div className="col-span-2 grid min-h-0 grid-cols-2 gap-2">
        <div className="grid min-h-0 grid-cols-2 grid-rows-2 gap-2">
          <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-2 backdrop-blur-md">
            <div className="text-muted-foreground text-xs">Switches</div>
          </div>
          <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-2 backdrop-blur-md">
            <div className="text-muted-foreground text-xs">Switches</div>
          </div>
          <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-2 backdrop-blur-md">
            <div className="text-muted-foreground text-xs">Switches</div>
          </div>
          <div className="bg-card/40 h-full rounded-2xl border border-white/10 p-2 backdrop-blur-md">
            <div className="text-muted-foreground text-xs">Switches</div>
          </div>
        </div>
        <div className="bg-card/40 min-h-0 rounded-2xl border border-white/10 p-2 backdrop-blur-md">
          <div className="text-muted-foreground text-xs">Battery</div>
        </div>
      </div>
    </div>
  )
}
