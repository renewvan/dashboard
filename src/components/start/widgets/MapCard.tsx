import { lazy, Suspense } from 'react'
import { Card } from '@heroui/react'
import type { Gps } from '@/types'
import type { StartWidgetProps } from './types'

// MapLibre is most of the bundle, so the map card loads with its own chunk, as the Map page does.
const MapPage = lazy(() => import('@/components/map/MapPage').then((m) => ({ default: m.MapPage })))

/** The map card's height: at least the Energy card's battery dial (up to 300px wide and square-ish, plus its title row). */
const MAP_CARD_HEIGHT = 'h-[360px]'

/** Edge to edge: no title row, no padding. The map is the card. */
export function MapCard({ gps, tilt, mapIsDark }: StartWidgetProps) {
  return (
    <Card className={`${MAP_CARD_HEIGHT} shrink-0 overflow-hidden p-0!`}>
      <Suspense
        fallback={
          <div
            data-testid="map-card-loading"
            aria-busy="true"
            className="text-muted flex size-full items-center justify-center text-sm"
          >
            Loading map…
          </div>
        }
      >
        <MapPage variant="card" gps={gps as Record<string, Gps>} tilt={tilt} isDark={mapIsDark} />
      </Suspense>
    </Card>
  )
}
