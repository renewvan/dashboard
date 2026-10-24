import { Button } from '@heroui/react'
import { Minus, Plus } from 'lucide-react'
import { useMap } from 'react-map-gl/maplibre'
import { MAP_GLASS } from './mapGlass'

// Exactly the readout's glass, border and (lack of) shadow, so the controls and the info box look
// like one family.
const BUTTON = `size-11! min-h-11! min-w-11! ${MAP_GLASS}`

/**
 * Zoom in and out, for a map that cannot be pinched: a gloved finger or a mouse has no two-finger
 * gesture, and the wheel is off so a page scroll never zooms the map by accident. 44x44px each, per
 * `docs/design-principles.md`, with a gap so a miss lands on empty map and not the other button.
 * MapLibre's own `NavigationControl` is about 29px, so it is not used.
 *
 * Must sit inside the `<Map>`: `useMap` reads the nearest one.
 */
export function ZoomControls() {
  const { current: map } = useMap()

  return (
    <div className="absolute top-[calc(var(--app-header-height,0px)+1rem)] right-4 z-10 flex flex-col gap-3">
      <Button
        isIconOnly
        variant="secondary"
        className={BUTTON}
        aria-label="Zoom in"
        onPress={() => map?.zoomIn()}
      >
        <Plus aria-hidden="true" className="size-5" />
      </Button>
      <Button
        isIconOnly
        variant="secondary"
        className={BUTTON}
        aria-label="Zoom out"
        onPress={() => map?.zoomOut()}
      >
        <Minus aria-hidden="true" className="size-5" />
      </Button>
    </div>
  )
}
