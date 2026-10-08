// Van art for the tilt card.
//
// Side view: the app's own lucide `Van` icon (same set as the sidebar and the
// Home empty state), so it matches the rest of the UI. Its nose faces RIGHT.
// lucide-react has no rear-view van, so VanRear is drawn by hand on the same
// 24-unit grid with lucide's stroke conventions (2px, round caps/joins).
//
// Both views are cropped so the wheels / feet sit exactly on the bottom edge
// of the SVG. A rotation about the bottom-centre (CSS `origin-bottom`) then
// tilts the van as it rests on the road, instead of lifting it off the line.

import { Van } from 'lucide-react'
import type { CSSProperties } from 'react'

interface ArtProps {
  className?: string
  style?: CSSProperties
}

// lucide's Van is 24x24 with the wheel bottoms at y = 20 (circles cy 18, r 2)
// and the roof at y = 6 (+ half the 2px stroke). Crop to that band so the
// wheels touch the bottom edge; the stroke's outer half still fits.
const SIDE_VIEWBOX = '1 5 22 16'

/** Side profile, nose facing RIGHT. */
export function VanSide({ className, style }: ArtProps) {
  return (
    <Van
      viewBox={SIDE_VIEWBOX}
      width="auto"
      height="auto"
      strokeWidth={1.6}
      className={className}
      style={style}
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    />
  )
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

/** Rear view, symmetrical about x = 12. Deliberately minimal like lucide's
 * own icons: tapered shell, window, door seam, mirrors, feet. Drawn to the
 * SAME height as the side view (y = 5.5 roof .. y = 20 ground) so the pair
 * reads as one van; the narrow 14-unit body keeps the tall rear proportion. */
export function VanRear({ className, style }: ArtProps) {
  return (
    <svg viewBox="4.5 5 15 16" className={className} style={style} aria-hidden="true">
      {/* Shell: roof narrower than the base (the reference's taper), rounded
          top corners, flat bottom resting on the feet */}
      <path
        {...stroke}
        d="M9.5 5.8h5a2 2 0 0 1 1.9 1.4l1.1 3.6V17a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1v-6.2l1.1-3.6a2 2 0 0 1 1.9-1.4Z"
      />
      {/* Rear window (wide, rounded) and the door seam either side of it */}
      <path
        {...stroke}
        d="M8.5 8.4h7a.5.5 0 0 1 .5.5v2.6a1 1 0 0 1-1 1h-6a1 1 0 0 1-1-1V8.9a.5.5 0 0 1 .5-.5Z"
      />
      <path {...stroke} d="M12 5.8v2.6M12 12.5V18" />
      {/* Door handle */}
      <path {...stroke} d="M13.6 14.6h1.2" />
      {/* Mirrors poking out at window height */}
      <path {...stroke} d="M7.2 9.4H5.8M16.8 9.4h1.4" />
      {/* Feet: the stroke's outer edge lands on the side view's wheel bottoms (y = 21) */}
      <path {...stroke} d="M8.2 18v2.2M15.8 18v2.2" />
    </svg>
  )
}
