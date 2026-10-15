const DAY_S = 86_400
const HOUR_S = 3_600
const MINUTE_S = 60

/**
 * Remaining runtime as its two largest units, `9d 23h to go` / `5h 12m to go` / `42m to go`.
 * Under a minute reads `<1m`. Truncates, never rounds up: a runtime estimate should not
 * overpromise. Not shown anywhere right now: the battery dial's bottom gap holds the solar
 * readout instead; this returns to the dial when the estimate has a place again.
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
