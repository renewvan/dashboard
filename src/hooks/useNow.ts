import { useEffect, useState } from 'react'

/**
 * Re-render on a slow interval with the current epoch ms — lets derived
 * views age (uplink staleness, router uptime) even when no bus traffic
 * arrives to re-render the tree. Shared by the header uplink button and
 * the Settings page's Network section (not yet ported).
 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}
