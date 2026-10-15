import type { ReactNode } from 'react'
import { Battery, Engine, Plug2, PlugZap, Sun, Zap } from 'lucide-react'
import type { PowerReading } from './dialModel'
import { arc } from './arcs'
import { CutBand } from './CutBand'

const POWER_ICONS: Record<PowerReading['source'], ReactNode> = {
  solar: <Sun className="size-4" />,
  'battery-in': <Zap className="size-4" />,
  'battery-out': <Plug2 className="size-4" />,
  'battery-net': <Battery className="size-4" />,
  alternator: <Engine className="size-4" />,
  shore: <PlugZap className="size-4" />,
}

// A half-moon is a 100° slice of a big circle whose centre sits off to the centre-dial side, so it
// reads as "(" on the left and ")" on the right. It is cut into one stacked band per reading,
// under the cockpit's thin outer ring.
const MOON_R = 200
const MOON_SPAN = 100
/** Degrees between two stacked bands. */
const BAND_GAP = 5
const BAND_STROKE = 14
const RING_STROKE = 3
const SEGMENTS = 3

// The box is cut to the drawing, so its outer edge is the outer ring's outer edge and a parent can
// align it to a padding line. The outer ring sits 14 units outside the bands.
const RING_R = MOON_R + 14
const OUTER_EDGE = RING_R + RING_STROKE / 2
const HALF_SPAN = ((MOON_SPAN / 2) * Math.PI) / 180
/** How far the arc reaches from its outermost point back toward the circle's centre. */
const MOON_DEPTH = OUTER_EDGE - (RING_R - RING_STROKE / 2) * Math.cos(HALF_SPAN)
/** Round caps and the bands' end faces overhang the arc's ends by about half a stroke. */
const END_PAD = BAND_STROKE / 2
const MOON_W = MOON_DEPTH + END_PAD
const MOON_H = 2 * OUTER_EDGE * Math.sin(HALF_SPAN) + 2 * END_PAD

type Side = 'left' | 'right'

/** One band's angle range, top first. Angles run clockwise from 12 o'clock. */
function bandRanges(side: Side, count: number): [number, number][] {
  const mid = side === 'left' ? 270 : 90
  const top = side === 'left' ? mid + MOON_SPAN / 2 : mid - MOON_SPAN / 2
  const bottom = side === 'left' ? mid - MOON_SPAN / 2 : mid + MOON_SPAN / 2
  const step = (bottom - top) / count
  return Array.from({ length: count }, (_, i) => [
    top + i * step + (i > 0 ? BAND_GAP / 2 : 0),
    top + (i + 1) * step - (i < count - 1 ? BAND_GAP / 2 : 0),
  ])
}

function Readouts({ side, readings }: { side: Side; readings: PowerReading[] }) {
  const end = side === 'right'
  return (
    <div className={`flex flex-col gap-8 ${end ? 'items-end' : 'items-start'}`}>
      {readings.map((reading, i) => (
        // Two slots may share a source, so the slot's position is the stable key.
        <div key={i} className={`flex flex-col ${end ? 'items-end' : ''}`}>
          <div className="text-muted flex items-center gap-1.5 text-[11px] tracking-[0.2em] uppercase">
            {!end && <span aria-hidden="true">{POWER_ICONS[reading.source]}</span>}
            {reading.label}
            {end && <span aria-hidden="true">{POWER_ICONS[reading.source]}</span>}
          </div>
          <div className="flex items-baseline text-5xl font-light italic tabular-nums">
            {reading.watts ?? '\u2014'}
            {reading.watts !== undefined && (
              <span className="text-accent ml-1 text-xl font-semibold not-italic">W</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * A side dial: one or two power readings stacked, each in its own cut band that fills upward from
 * the band's bottom, with the watts beside it. A reading whose source has not published shows a
 * dash and an empty band.
 */
export function HalfMoon({ side, readings }: { side: Side; readings: PowerReading[] }) {
  // The circle's centre x: the outer ring's outer edge sits exactly on the box edge facing away
  // from the centre dial.
  const cx = side === 'left' ? OUTER_EDGE : MOON_W - OUTER_EDGE
  const cy = MOON_H / 2
  const ranges = bandRanges(side, readings.length)
  const [spanTop, spanBottom] = [ranges[0]![0], ranges[ranges.length - 1]![1]]

  return (
    <div
      className={`flex w-full items-center ${side === 'left' ? 'justify-start' : 'justify-end'}`}
    >
      {side === 'right' && <Readouts side={side} readings={readings} />}
      <svg
        viewBox={`0 0 ${MOON_W} ${MOON_H}`}
        className="h-[min(60vh,360px)] shrink-0"
        style={{ aspectRatio: `${MOON_W} / ${MOON_H}` }}
        aria-hidden="true"
      >
        <path
          d={arc(spanTop, spanBottom, RING_R, cx, cy)}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.35}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
        />
        {readings.map((reading, i) => {
          const [top, bottom] = ranges[i]!
          // A level rises: start at the band's bottom end.
          return (
            <CutBand
              key={i}
              from={bottom}
              to={top}
              r={MOON_R}
              pct={reading.pct}
              color="var(--accent)"
              segments={SEGMENTS}
              stroke={BAND_STROKE}
              cx={cx}
              cy={cy}
            />
          )
        })}
      </svg>
      {side === 'left' && <Readouts side={side} readings={readings} />}
    </div>
  )
}
