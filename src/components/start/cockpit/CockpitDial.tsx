import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { DialReadout, type DialSize } from '../DialReadout'
import { BatteryPulse } from '../BatteryPulse'
import type { DialView } from './dialView'

interface DialProps {
  view: DialView
  icon: ReactNode
  /** `focus` is the page's headline dial: bigger readout, more room above the subline. */
  size: DialSize
  /** Soft glow behind the fill; dark theme only (it vanishes on a light background). */
  glow: boolean
  /** The battery dial while it charges: a soft band travels along its fill. */
  pulse?: boolean
  /**
   * Push the dial down so its arc ends sit on the baseline every dial on the kiosk shares (see
   * `ARC_END_GAP`). A dial alone in a card has no neighbour to line up with: pass false to centre it.
   */
  aligned?: boolean
  className?: string
}

// One viewBox for every dial, so geometry below is in these units whatever the rendered size.
const SIZE = 260
const C = SIZE / 2
const SWEEP = 270
const FROM = -SWEEP / 2
const SEGMENTS = 5
/** Gap between segments, in degrees (the "cuts"). */
const CUT = 1.6

// Concentric bands, outside to inside: thin continuous ring, the value band, the wide track.
const OUTER_R = 122
const OUTER_STROKE = 3
const BAND_R = 110
const BAND_STROKE = 10
const TRACK_R = 90
const TRACK_STROKE = 22

/**
 * The arc's open ends sit this far above the viewBox's bottom edge, as a fraction of the dial's
 * own height: 16.8%, measured (the ring's lowest point plus its round cap). It is a proportion,
 * so a bigger dial leaves a bigger gap; pushing each dial down by this share of itself puts every
 * dial's arc ends on the same line whatever its size.
 */
const ARC_END_GAP = 'translate-y-[16.8%]'

const SIZE_CLASS: Record<DialSize, string> = {
  side: 'max-w-[260px]',
  focus: 'max-w-[420px]',
}

function polar(angleDeg: number, r: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [C + r * Math.cos(a), C + r * Math.sin(a)] as const
}

function arc(from: number, to: number, r: number) {
  const [x1, y1] = polar(from, r)
  const [x2, y2] = polar(to, r)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`
}

const SEGMENT_SPAN = SWEEP / SEGMENTS

/** One arc per segment at radius `r`, shortened by the cut gap. */
function segments(r: number) {
  return Array.from({ length: SEGMENTS }, (_, i) =>
    arc(FROM + i * SEGMENT_SPAN + CUT / 2, FROM + (i + 1) * SEGMENT_SPAN - CUT / 2, r),
  )
}

const BAND_SEGMENTS = segments(BAND_R)
const TRACK_SEGMENTS = segments(TRACK_R)

/**
 * A 270° instrument dial: thin outer ring, a value band, a wide track, the band and the track cut
 * at the same angles, with the readout in the middle. The fill is painted through a mask of the
 * band's segments so the gaps cut it exactly; mask and filter regions are `userSpaceOnUse` over
 * the whole viewBox because the default (the filled arc's own bounding box) slices the band.
 * The arc ends are offset onto a shared baseline (see `ARC_END_GAP`).
 */
export function CockpitDial({
  view,
  icon,
  size,
  glow,
  pulse,
  aligned = true,
  className,
}: DialProps) {
  const uid = useId().replace(/:/g, '')
  const maskId = `cut-${uid}`
  const glowId = `glow-${uid}`
  const filledTo = FROM + (SWEEP * view.pct) / 100
  const wholeSvg = { x: 0, y: 0, width: SIZE, height: SIZE }

  return (
    <div
      className={cn(
        'relative aspect-square w-full',
        SIZE_CLASS[size],
        aligned && ARC_END_GAP,
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="size-full"
        role="img"
        aria-label={`${view.label} ${Math.round(view.pct)}%`}
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" {...wholeSvg}>
            {BAND_SEGMENTS.map((d) => (
              <path key={d} d={d} fill="none" stroke="white" strokeWidth={BAND_STROKE} />
            ))}
          </mask>
          {glow && (
            <filter id={glowId} filterUnits="userSpaceOnUse" {...wholeSvg}>
              <feGaussianBlur stdDeviation="6" />
            </filter>
          )}
        </defs>

        <path
          d={arc(FROM, -FROM, OUTER_R)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={OUTER_STROKE}
          strokeLinecap="round"
        />

        {BAND_SEGMENTS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.14}
            strokeWidth={BAND_STROKE}
          />
        ))}
        {view.pct > 0 && (
          <g mask={`url(#${maskId})`}>
            {glow && (
              <path
                d={arc(FROM, filledTo, BAND_R)}
                fill="none"
                stroke={view.color}
                strokeWidth={BAND_STROKE}
                filter={`url(#${glowId})`}
                opacity={0.85}
              />
            )}
            <path
              d={arc(FROM, filledTo, BAND_R)}
              fill="none"
              stroke={view.color}
              strokeWidth={BAND_STROKE}
            />
            {pulse && <BatteryPulse from={FROM} litTo={filledTo} r={BAND_R} stroke={BAND_STROKE} />}
          </g>
        )}

        {TRACK_SEGMENTS.map((d) => (
          <path
            key={d}
            d={d}
            fill="none"
            stroke="currentColor"
            strokeOpacity={0.09}
            strokeWidth={TRACK_STROKE}
          />
        ))}
      </svg>

      <div
        className="absolute inset-0 top-5 flex flex-col items-center justify-center"
        aria-hidden="true"
      >
        <DialReadout view={view} icon={icon} size={size} />
      </div>
    </div>
  )
}
