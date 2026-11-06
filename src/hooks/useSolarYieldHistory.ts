import { useEffect, useState } from 'react'
import { yieldHistoryFromPoints } from '@/components/widgets/solar/solarView'
import { queryInflux } from '@/lib/influx'
import type { FluxPoint } from '@/lib/influxCsv'
import { dailyYieldQuery } from '@/lib/influxQuery'
import { useNow } from './useNow'

/** Today's bar is the day's running maximum, so it is re-read now and then. */
const REFRESH_MS = 5 * 60_000

/**
 * A solar controller's daily harvest, newest first (index 0 is today), from the hub's InfluxDB
 * history. Falls back to `controllerLog` (the controller's own, much shorter, log from the bus)
 * while the query is loading, when InfluxDB is unreachable, or when it holds no days yet. The
 * points are indexed against the current day on every render, so the days stay right across
 * midnight; they belong to one controller and window, so another controller never shows them.
 */
export function useSolarYieldHistory(
  id: string | undefined,
  controllerLog: (number | null)[] | undefined,
  days: number,
): (number | null)[] | undefined {
  const [result, setResult] = useState<{ id: string; days: number; points: FluxPoint[] }>()
  const now = useNow(REFRESH_MS)
  useEffect(() => {
    if (id === undefined) return
    const abort = new AbortController()
    const load = () => {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      queryInflux(dailyYieldQuery({ id, days, timeZone }), abort.signal)
        .then((points) => setResult({ id, days, points }))
        .catch((error: unknown) => {
          if (abort.signal.aborted) return
          // Offline hub or a dev machine without the tunnel: the controller's log still charts.
          console.warn('Solar history unavailable from InfluxDB', error)
        })
    }
    load()
    const timer = setInterval(load, REFRESH_MS)
    return () => {
      abort.abort()
      clearInterval(timer)
    }
  }, [id, days])
  const fromInflux =
    result !== undefined && result.id === id && result.days === days
      ? yieldHistoryFromPoints(result.points, days, new Date(now))
      : undefined
  return fromInflux ?? controllerLog
}
