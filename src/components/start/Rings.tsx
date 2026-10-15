import { useId, type ReactNode } from 'react'
import { RINGS_SIZE, arc } from './arcs'
import { CutBand } from './CutBand'

/** One ring as drawn. `view` is undefined while its source has not fully arrived over MQTT. */
export interface RingModel {
  label: string
  icon: ReactNode
  /** 0..100: the arc fill, whatever unit the value is shown in; 0 with no `view`. */
  pct: number
  /** The number shown for the level: a whole percentage, or whole litres (`unit` says which). */
  value: number
  /** `%` or `ℓ`, set apart from the number in the legend. */
  unit: '%' | '\u2113'
  /** Severity colour from the same view the Tanks page paints with; dim when there is no data. */
  color: string
  hasData: boolean
}

// The cockpit's geometry: a thin outer ring wraps three 10-wide bands, each 4 units clear of the
// next (the cockpit's band-to-track clearance), the first 5.5 units inside the outer ring.
const FROM = -135
const TO = 135
const OUTER_R = 122
const OUTER_STROKE = 3
const BAND = 10
const GAP = 4
const FIRST_R = OUTER_R - OUTER_STROKE / 2 - 5.5 - BAND / 2
const SEGMENTS = 5

interface RingsProps {
  rings: RingModel[]
  /** Indices of `rings` listed under the arc. */
  legend: number[]
  /** Content inside the rings; the legend stays under the arc. */
  centre: ReactNode
  /** Soft glow behind the fill; dark theme only. */
  glow: boolean
}

/**
 * Concentric 270° rings, outermost first, each with the cockpit's five cuts and its severity
 * colour, around the readout, with a one-line legend per listed ring under the open mouth.
 */
export function Rings({ rings, legend, centre, glow }: RingsProps) {
  const uid = useId().replace(/:/g, '')
  const glowId = `glow-${uid}`

  return (
    <div className="relative aspect-square w-full max-w-[420px]">
      <svg
        viewBox={`0 0 ${RINGS_SIZE} ${RINGS_SIZE}`}
        className="size-full"
        role="group"
        aria-label="Levels"
      >
        <defs>
          {glow && (
            <filter
              id={glowId}
              filterUnits="userSpaceOnUse"
              x={0}
              y={0}
              width={RINGS_SIZE}
              height={RINGS_SIZE}
            >
              <feGaussianBlur stdDeviation="4" />
            </filter>
          )}
        </defs>
        <path
          d={arc(FROM, TO, OUTER_R)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={OUTER_STROKE}
          strokeLinecap="round"
        />
        {rings.map((ring, i) => {
          const r = FIRST_R - i * (BAND + GAP)
          return (
            <g
              key={i}
              role="img"
              aria-label={ring.hasData ? `${ring.label} ${ring.value}${ring.unit}` : ring.label}
            >
              <CutBand
                from={FROM}
                to={TO}
                r={r}
                pct={ring.pct}
                color={ring.color}
                segments={SEGMENTS}
                stroke={BAND}
              />
              {glow && ring.pct > 0 && (
                <path
                  d={arc(FROM, FROM + ((TO - FROM) * ring.pct) / 100, r)}
                  fill="none"
                  stroke={ring.color}
                  strokeWidth={BAND}
                  filter={`url(#${glowId})`}
                  opacity={0.5}
                />
              )}
            </g>
          )
        })}
      </svg>

      <div
        data-testid="rings-centre"
        className="absolute inset-[22%] bottom-[14%] flex flex-col items-center justify-center"
      >
        {centre}
      </div>

      <div
        className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-1"
        aria-hidden="true"
      >
        {legend.map((index) => {
          const ring = rings[index]!
          return (
            <div
              key={index}
              className="flex items-center gap-2 text-sm tracking-wider uppercase tabular-nums"
            >
              <span className="text-muted">{ring.icon}</span>
              <span className="text-muted">{ring.label}</span>
              <span className="font-semibold">
                {ring.hasData ? ring.value : '\u2013'}
                <span className="text-accent text-xs">{ring.unit}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
