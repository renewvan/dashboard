import { Button } from '@heroui/react'
import { LocateFixed } from 'lucide-react'
import { useMap } from 'react-map-gl/maplibre'
import { cn } from '@/lib/utils'
import { MAP_GLASS } from './mapGlass'

const BUTTON = `size-11! min-h-11! min-w-11! ${MAP_GLASS}`

/**
 * Brings the map back to the van after it has been dragged away. 44x44px, per
 * `docs/design-principles.md`. Disabled while there is no position to return to.
 *
 * Must sit inside the `<Map>`: `useMap` reads the nearest one.
 */
export function RecenterButton({
  position,
  zoom,
  className,
}: {
  /** The van's [latitude, longitude], or null with no fix. */
  position: readonly [number, number] | null
  /** Zoom to return to. */
  zoom: number
  className?: string
}) {
  const { current: map } = useMap()

  return (
    <div
      className={cn(
        // Default: the Map page, whose header floats over the map, so clear it.
        'absolute top-[calc(var(--app-header-height,0px)+1rem)] left-4 z-10',
        className,
      )}
    >
      <Button
        isIconOnly
        variant="secondary"
        className={BUTTON}
        aria-label="Centre on van"
        isDisabled={!position}
        onPress={() => {
          if (position) map?.easeTo({ center: [position[1], position[0]], zoom })
        }}
      >
        <LocateFixed aria-hidden="true" className="size-5" />
      </Button>
    </div>
  )
}
