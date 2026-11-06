import type { Battery } from '@/types'

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

/** Below this discharge current (A) the bank counts as idle and no runtime is estimated. */
const DEADBAND_A = 0.1

/**
 * Seconds until empty: the source's own estimate when it publishes one, else a fallback from its
 * fuel gauge (`remaining_ah`, or `capacity_ah` × SoC) over the present discharge current. Without a
 * discharge (charging, idle) or without capacity data there is nothing to estimate: `undefined`.
 */
export function batteryTimeToGoS(
  b: Pick<Battery, 'time_to_go_s' | 'remaining_ah' | 'capacity_ah' | 'soc_pct' | 'current_a'>,
): number | undefined {
  if (b.time_to_go_s !== undefined) return b.time_to_go_s
  if (b.current_a === undefined || b.current_a > -DEADBAND_A) return undefined
  const ah =
    b.remaining_ah ?? (b.capacity_ah === undefined ? undefined : (b.capacity_ah * b.soc_pct) / 100)
  if (ah === undefined) return undefined
  return Math.round((ah / -b.current_a) * HOUR_S)
}
