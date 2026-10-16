import { C, CUT, arc, minRoundedDeg, slice } from './arcs'

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
  /**
   * Corner radius, in the drawing's units (see `cornerRadius` in `arcs.ts`), of the band's two outer
   * ends and of the fill's end; the cuts between segments stay square. Square ends when absent.
   */
  cornerR?: number
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
  cornerR,
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
        // `a` is where this segment starts along the fill, `b` where it ends; a slice wants them as its
        // smaller and larger angle, whichever way the band runs.
        const startIsLow = dir > 0
        // The band's own two ends are rounded, and so is the end of the fill wherever the level stops
        // (mid-segment, or on a cut). The cut between two segments is not an end and stays square.
        const roundStart = i === 0
        const roundEnd = i === segments - 1
        // A fill shorter than its two corners together would fold over itself: draw it square.
        const fillFits =
          cornerR !== undefined && Math.abs(litB - a) >= minRoundedDeg(r, stroke, cornerR)
        const stopsHere = dir > 0 ? litEnd <= b : litEnd >= b
        const fillEndRounds = fillFits && (stopsHere || roundEnd)
        const fillStartRounds = fillFits && roundStart
        return (
          <g key={i}>
            {cornerR !== undefined ? (
              <path
                d={slice(
                  a,
                  b,
                  r,
                  stroke,
                  cornerR,
                  startIsLow ? roundStart : roundEnd,
                  startIsLow ? roundEnd : roundStart,
                  cx,
                  cy,
                )}
                fill="currentColor"
                fillOpacity={0.14}
              />
            ) : (
              <path
                d={arc(a, b, r, cx, cy)}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.14}
                strokeWidth={stroke}
              />
            )}
            {lit &&
              (cornerR !== undefined ? (
                <path
                  d={slice(
                    a,
                    litB,
                    r,
                    stroke,
                    cornerR,
                    startIsLow ? fillStartRounds : fillEndRounds,
                    startIsLow ? fillEndRounds : fillStartRounds,
                    cx,
                    cy,
                  )}
                  fill={color}
                />
              ) : (
                <path d={arc(a, litB, r, cx, cy)} fill="none" stroke={color} strokeWidth={stroke} />
              ))}
          </g>
        )
      })}
    </g>
  )
}
