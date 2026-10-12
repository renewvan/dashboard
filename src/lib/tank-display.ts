const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const MS_PER_HOUR = 3_600_000
/** A latch younger than this has no meaningful pace yet (it would read as a near-infinite rate). */
const MIN_ELAPSED_HOURS = 1 / 60

/** Fresh first, then grey; any other tank follows, by id. */
const TANK_ORDER = ['fresh', 'grey']

/**
 * Average pace in litres per hour since `latchIso` (the `last_full_at` or
 * `last_empty_at` the caller picked), from the matching `volume_since_*_l`.
 * Undefined with no latch yet, or while the latch is under a minute old.
 * `now` is injected so callers and tests own the clock.
 */
export function consumptionRateLph(
  volumeL: number,
  latchIso: string | undefined,
  now: Date,
): number | undefined {
  if (!latchIso) return undefined
  const elapsedHours = (now.getTime() - new Date(latchIso).getTime()) / MS_PER_HOUR
  if (elapsedHours < MIN_ELAPSED_HOURS) return undefined
  return volumeL / elapsedHours
}

/**
 * Formats an ISO-8601 latch timestamp as `14 Jul 2026 09:41`: local date and
 * 24h time. A fixed shape, not `toLocaleDateString`, whose output reorders
 * and punctuates by browser locale (en-US gives "Jul 14, 2026, 9:41 AM").
 */
export function formatLatchDate(iso: string): string {
  const date = new Date(iso)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()} ${hh}:${mm}`
}

/** Tank ids in render order: fresh, grey, then every other tank by id. */
export function sortTankIds(ids: readonly string[]): string[] {
  const rank = (id: string) => {
    const index = TANK_ORDER.indexOf(id)
    return index === -1 ? TANK_ORDER.length : index
  }
  return [...ids].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

/** Headline for the Settings group row, e.g. `2 tanks`. */
export function tankSummary(ids: readonly string[]): string {
  if (ids.length === 0) return 'No tanks found'
  return ids.length === 1 ? '1 tank' : `${ids.length} tanks`
}
