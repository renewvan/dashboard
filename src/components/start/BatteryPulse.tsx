import { motion, useReducedMotion } from 'motion/react'
import { PULSE_PAUSE_S, pulseSeconds } from '@/components/power/flowModel'
import { arc } from './arcs'

/** The band's length as a share of the full 270° sweep. */
const BAND_SHARE = 0.14
/** One pass at the slowest pace, the same as the Power page's battery at its slowest charge. */
const SLOWEST_PASS_S = pulseSeconds(0, 1)
/** The band is a stack of dashes whose opacity falls off behind its leading edge, so no hard edge. */
const SLICES = 10

/** The brightest opacity, at the band's leading edge: a white highlight over the saturated fill. */
const PEAK_OPACITY = 0.5

interface BatteryPulseProps {
  from: number
  /** The end of the lit arc (`from` + the sweep × the charge). */
  litTo: number
  r: number
  stroke: number
  /**
   * The loop's pass and phase when it must beat with another band on screen (`pulseClock`). Without
   * one, a pass at the slowest pace, starting when it mounts.
   */
  clock?: { passS: number; delayS: number }
}

/**
 * A soft band that travels along the lit part of the battery ring while the battery charges, from where the fill starts
 * to where it ends, as the Power page's battery band travels up its fill: it slides in from before
 * the start, leaves past the end, rests hidden for `PULSE_PAUSE_S`, and goes again. Like Venus OS's
 * band it is brightest at its leading edge and fades to nothing behind it, one side only.
 *
 * It is dashes on the lit arc's own path, so it can never leave the fill and needs no clip. The path
 * is normalised to length 100, so the travel is in percent of the lit arc and nothing is measured. A
 * gradient cannot follow an arc, so the fade is a stack of dashes of falling opacity.
 */
export function BatteryPulse({ from, litTo, r, stroke, clock }: BatteryPulseProps) {
  const reduce = useReducedMotion()
  if (reduce || litTo <= from) return null

  const d = arc(from, litTo, r)
  const passS = clock?.passS ?? SLOWEST_PASS_S
  const total = passS + PULSE_PAUSE_S
  // The band's length in path units (the lit arc is 100). A longer arc carries a longer band.
  const band = ((BAND_SHARE * 270) / (litTo - from)) * 100
  const slice = band / SLICES

  return (
    <g>
      {Array.from({ length: SLICES }, (_, i) => {
        // Slice 0 is the leading edge (furthest along the path), the last slice the tail: opacity
        // falls linearly from `PEAK_OPACITY` to nothing.
        const weight = 1 - i / SLICES
        // `strokeDashoffset` shifts the dash back along the path, so a positive value puts it
        // before the start. It begins fully before the start and ends fully past the end.
        const start = slice * (i + 1)
        const end = -(100 + slice * (SLICES - i - 1))
        return (
          <motion.path
            key={i}
            d={d}
            pathLength={100}
            fill="none"
            stroke="white"
            strokeWidth={stroke}
            strokeDasharray={`${slice} ${200}`}
            opacity={PEAK_OPACITY * weight}
            initial={{ strokeDashoffset: start }}
            animate={{ strokeDashoffset: [start, end, end] }}
            transition={{
              duration: total,
              times: [0, passS / total, 1],
              repeat: Infinity,
              ease: 'linear',
              delay: clock?.delayS ?? 0,
            }}
          />
        )
      })}
    </g>
  )
}
