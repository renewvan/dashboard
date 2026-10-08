import type { CSSProperties } from 'react'

// Rear-view van, authored as a single stroked outline in assets/van-rear.svg (2.5
// stroke on a 68-unit-tall canvas, shared with the side view so the two
// have identical line weight at one CSS height). Drawn in currentColor so the
// card's green/amber tint applies. The viewBox is the authored canvas: the
// feet sit at the bottom edge, which is the ground line that CSS
// `origin-bottom` pivots on.
//
// Round caps and joins on both views: the rear was authored with default
// (butt/miter) ends, which read as sharper than the side van beside it.

interface ArtProps {
  className?: string
  style?: CSSProperties
}

const PATH =
  'M63.721 58.752 C66.127 58.751 67.535 58.096 67.449 55.901 C67.195 40.873 66.994 18.62 65.266 6.964 C64.19 3.151 61.767 2.128 58.917 1.947 C37.868 1.018 37.831 1.018 16.995 1.947 C14.145 2.128 11.721 2.201 10.646 6.014 C8.917 17.669 8.716 40.873 8.463 55.901 C8.376 58.096 9.785 58.751 12.19 58.752 C37.868 58.752 23.408 58.752 63.721 58.752 Z M20.471 8.752 L55.404 8.752 C57.213 8.752 58.679 10.109 58.679 11.783 L58.679 27.947 C58.679 29.621 57.381 32.752 55.573 32.752 L43.405 32.752 L38.826 30.947 L21.466 31.003 C19.657 31.003 17.196 29.621 17.196 27.947 L17.196 11.783 C17.196 10.109 18.662 8.752 20.471 8.752 Z M41.212 37.752 L46.671 37.752 M20.472 40.708 L32.478 40.708 C33.215 40.708 33.812 41.263 33.812 41.947 L33.812 44.425 C33.812 45.11 33.215 45.664 32.478 45.664 L20.472 45.664 C19.735 45.664 19.138 45.11 19.138 44.425 L19.138 41.947 C19.138 41.263 19.735 40.708 20.472 40.708 Z M8.892 48.551 L14.35 48.551 M3.433 18.752 L6.708 18.752 C7.914 18.752 8.892 19.647 8.892 20.752 L8.892 29.752 C8.892 30.856 7.914 31.752 6.708 31.752 L3.433 31.752 C2.227 31.752 1.25 30.856 1.25 29.752 L1.25 20.752 C1.25 19.647 2.227 18.752 3.433 18.752 Z M9.368 34.677 C10.488 34.677 14.953 34.442 14.953 37.069 L15.013 51.752 L60.793 51.752 L60.899 51.752 L60.959 37.069 C60.959 34.442 65.424 34.677 66.544 34.677 M13.921 58.752 L13.921 66.752 L22.654 66.752 L22.654 58.752 Z M67.02 48.551 L61.562 48.551 M72.478 18.752 L69.204 18.752 C67.998 18.752 67.02 19.647 67.02 20.752 L67.02 29.752 C67.02 30.856 67.998 31.752 69.204 31.752 L72.478 31.752 C73.684 31.752 74.662 30.856 74.662 29.752 L74.662 20.752 C74.662 19.647 73.684 18.752 72.478 18.752 Z M61.991 58.752 L61.991 66.752 L53.258 66.752 L53.258 58.752 Z M37.956 1.25 L37.956 51.755'

export function VanRear({ className, style }: ArtProps) {
  return (
    <svg viewBox="0 0 75.912 68.002" className={className} style={style} aria-hidden="true">
      <path
        d={PATH}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
