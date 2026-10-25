const DAY_S = 86_400
const HOUR_S = 3_600
const MINUTE_S = 60

/**
 * Remaining runtime as its two largest units, `9d 23h` / `5h 12m` / `42m`. Under a minute reads
 * `<1m`. Truncates, never rounds up: a runtime estimate should not overpromise. Shown under the
 * battery dial's subline and beside the battery state on the Power page.
 */
export function formatTimeToGo(seconds: number): string {
  const d = Math.floor(seconds / DAY_S)
  const h = Math.floor((seconds % DAY_S) / HOUR_S)
  const m = Math.floor((seconds % HOUR_S) / MINUTE_S)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return '<1m'
}
