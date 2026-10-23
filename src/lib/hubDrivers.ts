import type { DriverRow } from './drivers'

/** How many Drivers the hub's bus has, by what they last said about themselves. */
export interface DriverCounts {
  online: number
  offline: number
  /** Info but no health yet, or online with no info: neither up nor down as far as the bus says. */
  unknown: number
  total: number
}

/**
 * Counts the Drivers behind `Settings → Drivers`. A fallback row (`domain:<entity>`) is an entity
 * type no Driver claims, not a Driver, so it is not counted: the total is what has announced itself
 * on the bus, and what could be offline.
 */
export function driverCounts(rows: readonly DriverRow[]): DriverCounts {
  const counts: DriverCounts = { online: 0, offline: 0, unknown: 0, total: 0 }
  for (const row of rows) {
    if (row.key.startsWith('domain:')) continue
    counts.total += 1
    if (row.status === 'Online') counts.online += 1
    else if (row.status === 'Offline') counts.offline += 1
    else counts.unknown += 1
  }
  return counts
}

/** `3 online`, `2 online · 1 offline`, `2 online · 1 offline · 1 unknown`; `None` with no Driver. */
export function driverCountsText(counts: DriverCounts): string {
  if (counts.total === 0) return 'None'
  return [
    counts.online > 0 || (counts.offline === 0 && counts.unknown === 0)
      ? `${counts.online} online`
      : null,
    counts.offline > 0 ? `${counts.offline} offline` : null,
    counts.unknown > 0 ? `${counts.unknown} unknown` : null,
  ]
    .filter((part) => part !== null)
    .join(' · ')
}
