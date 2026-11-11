import { useEffect, useState } from 'react'

/**
 * Polls the site while `active` and says when the hub answers. Any HTTP answer below 500 counts, the
 * login service's 401 included (signed out still means the hub is up). A network error, or a 5xx from
 * the proxy while the containers start, keeps waiting. Gives up after `maxMs`.
 */
export function useHubReachable(
  active: boolean,
  { fetcher = fetch, intervalMs = 3000, maxMs = 5 * 60_000 } = {},
): { reachable: boolean; gaveUp: boolean } {
  const [state, setState] = useState({ reachable: false, gaveUp: false })
  useEffect(() => {
    if (!active) return
    let stopped = false
    const started = Date.now()
    const tick = async () => {
      try {
        const res = await fetcher('/api/session', { cache: 'no-store' })
        if (!stopped && res.status < 500) {
          setState({ reachable: true, gaveUp: false })
          return
        }
      } catch {
        // still off, or this device is not on the van's network: keep waiting
      }
      if (stopped) return
      if (Date.now() - started >= maxMs) setState({ reachable: false, gaveUp: true })
      else timer = setTimeout(tick, intervalMs)
    }
    let timer = setTimeout(tick, intervalMs)
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [active, fetcher, intervalMs, maxMs])
  return state
}
