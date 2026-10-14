import { C, CUT, arc } from './arcs'

interface CutBandProps {
  /** Where the level starts. */
  from: number
  /** Where the level is full; either end may be the smaller angle. */
  to: number
  r: number
  /** 0..100, lit from `from` toward `to`, ending mid-segment. */
  pct: number
  color: string
  segments: number
  stroke: number
  cx?: number
  cy?: number
}

/** A dim band cut into `segments`, with the lit part drawn over it in `color`. */
export function CutBand({
  from,
  to,
  r,
  pct,
  color,
  segments,
  stroke,
  cx = C,
  cy = C,
}: CutBandProps) {
  const dir = Math.sign(to - from)
  const span = (to - from) / segments
  const litEnd = from + ((to - from) * pct) / 100
  return (
    <g>
      {Array.from({ length: segments }, (_, i) => {
        const a = from + i * span + (dir * CUT) / 2
        const b = from + (i + 1) * span - (dir * CUT) / 2
        // Clamp the lit end into this segment, in the direction of travel.
        const litB = dir > 0 ? Math.min(b, litEnd) : Math.max(b, litEnd)
        const lit = dir > 0 ? litB > a : litB < a
        return (
          <g key={i}>
            <path
              d={arc(a, b, r, cx, cy)}
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.14}
              strokeWidth={stroke}
            />
            {lit && (
              <path d={arc(a, litB, r, cx, cy)} fill="none" stroke={color} strokeWidth={stroke} />
            )}
          </g>
        )
      })}
    </g>
  )
}
