import type { Tilt } from '@/types'

/** Within this many degrees the van counts as level for that axis. A
 * presentation threshold: the node publishes raw angles, not a level flag. */
export const LEVEL_TOLERANCE_DEG = 1

/** The drawn vans stop rotating past this; the number still shows the truth. */
export const MAX_DRAWN_TILT_DEG = 12

export interface TiltReading {
  /** Degrees, positive = left side down; null when there is no usable reading. */
  roll: number | null
  /** Degrees, positive = nose up; null when there is no usable reading. */
  pitch: number | null
}

/**
 * The angles worth showing, or nulls. While the node reports `sensor_error`
 * it stops republishing, but the LAST retained angles stay on the broker, so
 * a stale value must not be drawn as if it were live.
 */
export function tiltReading(tilt: Partial<Tilt> | undefined): TiltReading {
  if (
    !tilt ||
    tilt.status !== 'ok' ||
    !Number.isFinite(tilt.roll_deg) ||
    !Number.isFinite(tilt.pitch_deg)
  ) {
    return { roll: null, pitch: null }
  }
  return { roll: tilt.roll_deg as number, pitch: tilt.pitch_deg as number }
}

export function isLevel(deg: number | null): boolean {
  return deg !== null && Math.abs(deg) <= LEVEL_TOLERANCE_DEG
}

/** `+4.0°` / `-2.2°` / `0.0°`; an em dash with no reading. Never `-0.0°`. */
export function formatDeg(deg: number | null): string {
  if (deg === null) return '—'
  const rounded = Math.round(deg * 10) / 10
  if (rounded === 0) return '0.0°'
  return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}°`
}

function clamp(deg: number): number {
  return Math.max(-MAX_DRAWN_TILT_DEG, Math.min(MAX_DRAWN_TILT_DEG, deg))
}

/**
 * CSS rotation (degrees, clockwise-positive) for the side-view van, which
 * faces RIGHT: nose up lifts the right end, a clockwise turn.
 */
export function sideViewRotation(pitch: number | null): number {
  return pitch === null ? 0 : clamp(pitch)
}

/**
 * CSS rotation for the rear-view van. Left side down (+roll) drops the left
 * end as seen from behind, a counter-clockwise turn.
 */
export function rearViewRotation(roll: number | null): number {
  return roll === null ? 0 : -clamp(roll)
}
