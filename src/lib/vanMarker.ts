/** Below this speed a GPS course is noise (the receiver reports the last or a random bearing). */
export const MIN_HEADING_SPEED_KMH = 3

/**
 * The bearing to draw, or null while there is none worth drawing. `course_deg` is the direction of
 * travel, so it only means something while the van moves: at a standstill it is stale or jittery.
 * Normalised into [0, 360).
 */
export function headingDeg(
  course: number | undefined,
  speedKmh: number | undefined,
): number | null {
  if (course === undefined || !Number.isFinite(course)) return null
  if (speedKmh === undefined || !Number.isFinite(speedKmh) || speedKmh < MIN_HEADING_SPEED_KMH) {
    return null
  }
  return ((course % 360) + 360) % 360
}

/**
 * The side-view van faces RIGHT. Heading east of the north-south line (0–180°) keeps it facing
 * right; west of it (180–360°) mirrors it to face left. Exactly 0 and 180 (due north / south)
 * keep it facing right, so the art never flickers between the two at the axis.
 */
export function facesLeft(heading: number | null): boolean {
  return heading !== null && heading > 180 && heading < 360
}

/** `N`, `NE`, `E` … for a bearing; an em dash with none. */
const POINTS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'] as const

export function compassPoint(heading: number | null): string {
  if (heading === null) return '—'
  return POINTS[Math.round(heading / 45) % 8]
}
