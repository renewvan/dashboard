import type { CSSProperties } from 'react'
import { VAN_SIDE_PATH } from './VanSide'

// A solid side-view van (nose RIGHT) on the same 113.312 x 68.002 canvas as `VanSide`, for places
// the stroked outline is too faint to read: the map marker. The body is `color`, the windows are
// `glass`, the tyres `outline`, the wheel hubs light, and `VanSide`'s own outline path is stroked
// over it in `outline` so the doors, panels and bumpers keep the weight they have everywhere else.

interface Props {
  /** Body colour (any CSS colour). */
  color: string
  /** Outline and tyre colour. */
  outline: string
  /** Window colour. */
  glass: string
  className?: string
  style?: CSSProperties
}

const BODY =
  'M3.682 51.755 L3.682 6.661 C3.682 3.672 6.013 1.25 8.888 1.25 L87.421 1.25 C89.318 1.25 90.899 2.148 91.994 3.665 L107.038 25.156 C108.17 26.673 108.68 28.317 108.68 30.402 L108.68 51.755 Z'
const BUMPER =
  'M1.25 53.861 C1.25 52.457 1.854 51.755 3.062 51.755 L110.249 51.755 C111.457 51.755 112.062 52.457 112.062 53.861 L112.062 56.646 C112.062 58.05 111.457 58.752 110.249 58.752 L3.062 58.752 C1.854 58.752 1.25 58.05 1.25 56.646 Z'
// Cab and cargo windows, taken from the outline's own glass cut-outs.
const GLASS = [
  'M12.892 8.727 L32.251 8.727 C32.981 8.727 33.572 9.478 33.572 10.404 L33.572 29.05 C33.572 29.977 32.981 30.727 32.251 30.727 L12.892 30.727 C12.163 30.727 11.572 29.977 11.572 29.05 L11.572 10.404 C11.572 9.478 12.163 8.727 12.892 8.727 Z',
  'M41.065 8.752 L60.507 8.752 C61.214 8.752 61.786 9.503 61.786 10.429 L61.786 29.075 C61.786 30.001 61.214 30.752 60.507 30.752 L41.065 30.752 C40.359 30.752 39.786 30.001 39.786 29.075 L39.786 10.429 C39.786 9.503 40.359 8.752 41.065 8.752 Z',
  'M77.597 8.727 L90.181 8.757 L103.205 27.821 L77.565 27.825 Z',
]
const TYRES = [
  'M33.979 56.782 C33.979 62.288 29.405 66.752 23.763 66.752 C18.12 66.752 13.546 62.288 13.546 56.782 C13.546 51.276 18.12 46.813 23.763 46.813 C29.405 46.813 33.979 51.276 33.979 56.782 Z',
  'M94.463 56.782 C94.463 62.288 89.554 66.752 84.246 66.752 C78.938 66.752 74.03 62.288 74.03 56.782 C74.03 51.276 78.938 46.813 84.246 46.813 C89.554 46.813 94.463 51.276 94.463 56.782 Z',
]
const HUBS: [number, number][] = [
  [23.763, 56.782],
  [84.246, 56.782],
]

export function VanFilled({ color, outline, glass, className, style }: Props) {
  return (
    <svg viewBox="0 0 113.312 68.002" className={className} style={style} aria-hidden="true">
      <path d={BODY} fill={color} />
      <path d={BUMPER} fill={color} />
      {GLASS.map((d) => (
        <path key={d} d={d} fill={glass} />
      ))}
      {TYRES.map((d) => (
        <path key={d} d={d} fill={outline} />
      ))}
      {HUBS.map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r={4.2} fill="white" />
      ))}
      <path
        d={VAN_SIDE_PATH}
        fill="none"
        stroke={outline}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
