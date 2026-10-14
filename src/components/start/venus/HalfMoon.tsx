import type { ReactNode } from 'react'
import { Battery, Sun, Zap, ZapOff } from 'lucide-react'
import type { PowerSource } from '@/hooks/useStartPowerSources'
import { arc } from './arcs'
import { CutBand } from './CutBand'
import type { PowerReading } from './venusView'

const POWER_ICONS: Record<PowerSource, ReactNode> = {
  solar: <Sun className="size-4" />,
  'battery-in': <Zap className="size-4" />,
  'battery-out': <ZapOff className="size-4" />,
  'battery-net': <Battery className="size-4" />,
}

// A half-moon is a 100° slice of a big circle whose centre sits off to the centre-dial side, so it
// reads as "(" on the left and ")" on the right. It is cut into one stacked band per reading,
// under the cockpit's thin outer ring.
const MOON_R = 200
const MOON_SPAN = 100
const MOON_W = 80
const MOON_H = 2 * MOON_R * Math.sin(((MOON_SPAN / 2) * Math.PI) / 180) + 24
/** Degrees between two stacked bands. */
const BAND_GAP = 5
const BAND_STROKE = 14
const RING_STROKE = 3
const SEGMENTS = 3

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
  // The circle's centre x: the moon's outermost point sits at the box edge facing away from it.
  const cx = side === 'left' ? MOON_R + 6 : MOON_W - MOON_R - 6
  const cy = MOON_H / 2
  const ranges = bandRanges(side, readings.length)
  const [spanTop, spanBottom] = [ranges[0]![0], ranges[ranges.length - 1]![1]]

  return (
    <div className="flex w-full items-center justify-center gap-4">
      {side === 'right' && <Readouts side={side} readings={readings} />}
      <svg
        viewBox={`0 0 ${MOON_W} ${MOON_H}`}
        className="h-[min(60vh,360px)] shrink-0"
        style={{ aspectRatio: `${MOON_W} / ${MOON_H}` }}
        aria-hidden="true"
      >
        <path
          d={arc(spanTop, spanBottom, MOON_R + 14, cx, cy)}
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
