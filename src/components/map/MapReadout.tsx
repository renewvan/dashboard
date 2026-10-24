import { Chip } from '@heroui/react'
import { MapPin, Navigation, Satellite } from 'lucide-react'
import { cn } from '@/lib/utils'
import { compassPoint } from '@/lib/vanMarker'
import type { Gps } from '@/types'
import { MAP_GLASS } from './mapGlass'

/**
 * The fix / place / satellites / speed / heading readout over the map's bottom-left corner.
 *
 * `compact` is the pin icon alone, for a phone while the map credits are open: the credits' text
 * runs about 170px and there is no room beside a full readout. It is the height of MapLibre's (i)
 * and sits on the same 10px baseline, so the two line up. Otherwise it is the whole card.
 */
export function MapReadout({
  record,
  heading,
  placeName,
  compact = false,
  className,
}: {
  record: Gps
  /** The van's bearing in degrees, or null at a standstill. */
  heading: number | null
  placeName: string | undefined
  /** Just the pin icon. */
  compact?: boolean
  /** Where the page puts it: the corner on the kiosk, a cell in the bottom row on a phone. */
  className?: string
}) {
  if (compact) {
    return (
      <div
        data-testid="map-readout"
        role="img"
        aria-label={`${record.fix_quality.toUpperCase()} fix`}
        // The readout's own glass, in the shape and size of MapLibre's (i): a 24px circle.
        className={cn(
          MAP_GLASS,
          'absolute bottom-2.5 left-2.5 z-10 flex size-6 items-center justify-center rounded-full!',
        )}
      >
        <MapPin aria-hidden="true" className="size-3" />
      </div>
    )
  }

  return (
    <div
      data-testid="map-readout"
      className={cn(
        'z-10 flex max-w-[calc(100%-2rem)] flex-col gap-1.5 px-4 py-2.5',
        MAP_GLASS,
        className,
      )}
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
  )
}
