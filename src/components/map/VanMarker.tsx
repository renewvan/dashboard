import { Marker } from 'react-map-gl/maplibre'
import { VanFilled } from '@/components/widgets/tilt/VanFilled'
import { facesLeft } from '@/lib/vanMarker'
import { sideViewRotation } from '@/lib/tilt'

export interface VanMarkerProps {
  longitude: number
  latitude: number
  /** Bearing in degrees (0 = north, clockwise) while the van moves; null at a standstill. */
  heading: number | null
  /** Nose-up pitch in degrees from the tilt device; null without a usable reading. */
  pitch: number | null
}

const VAN_W = 58
const VAN_H = (VAN_W * 68.002) / 113.312

/** A tight contact shadow plus a soft wide one, so the van lifts off any tile colour. */
const VAN_SHADOW =
  'drop-shadow(0 1px 1px rgba(15,23,42,0.55)) drop-shadow(0 5px 6px rgba(15,23,42,0.35))'

/**
 * The van on the map: the blue side-view van (`VanFilled`, the theme accent), nothing around it. It
 * mirrors to face the way it is heading and pitches with the tilt device, pivoting on its wheels as
 * the tilt widget does. The marker's children are ordinary React, so it re-renders with the heading
 * and pitch like any other component.
 */
export function VanMarker({ longitude, latitude, heading, pitch }: VanMarkerProps) {
  const left = facesLeft(heading)
  // The mirror (`scaleX(-1)`) on the wrapper also flips the child's rotation, so a left-facing
  // van's nose-up pitch is still the plain clockwise value: it turns counter-clockwise on screen.
  const pitchRotation = sideViewRotation(pitch)

  return (
    // Wheels on the ground at the position: bottom-centre.
    <Marker longitude={longitude} latitude={latitude} anchor="bottom">
      <div
        data-testid="van-marker"
        style={{
          width: VAN_W,
          height: VAN_H,
          transform: left ? 'scaleX(-1)' : undefined,
        }}
      >
        <VanFilled
          color="var(--accent)"
          outline="#0f172a"
          glass="#e0f2fe"
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            transformOrigin: 'bottom center',
            transform: `rotate(${pitchRotation}deg)`,
            filter: VAN_SHADOW,
          }}
        />
      </div>
    </Marker>
  )
}
