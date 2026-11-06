/** The bucket the hub's logger writes to (hub/docker-compose.yml). */
const BUCKET = 'renewvan'

/** A Flux string literal: backslashes and double quotes escaped so a value cannot end the string. */
function fluxString(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

/**
 * Flux for a solar controller's harvest per local day: the day's `max` of `yield_today_wh` (the
 * controller's counter climbs through the day and resets at midnight), one point per day stamped at
 * the day's start. Aggregated by InfluxDB so the browser receives a handful of points, not raw
 * samples. Reaches back one day more than asked, because the oldest window is usually partial.
 */
export function dailyYieldQuery({
  id,
  days,
  timeZone,
}: {
  id: string
  days: number
  timeZone: string
}): string {
  return [
    'import "timezone"',
    `option location = timezone.location(name: ${fluxString(timeZone)})`,
    `from(bucket: ${fluxString(BUCKET)})`,
    `  |> range(start: -${days + 1}d)`,
    `  |> filter(fn: (r) => r._measurement == "solar" and r.id == ${fluxString(id)} and r._field == "yield_today_wh")`,
    '  |> aggregateWindow(every: 1d, fn: max, timeSrc: "_start")',
  ].join('\n')
}
