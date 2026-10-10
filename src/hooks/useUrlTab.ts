import { useEffect, useState } from 'react'
import { pushSearchParams } from '@/lib/urlHistory'

/**
 * Syncs the active tab with the URL's `?tab=` search param via the native
 * History API. No router library: the kiosk has a flat, un-nested set of
 * tabs (see `NAV_ITEMS` in `App.tsx`), so `pushState`/`popstate` covers
 * deep-linking and back/forward without pulling in react-router et al.
 *
 * `setTab(id, params)` pushes ONE history entry whose query is exactly `tab` plus `params`: any
 * other param the caller does not pass is dropped, so a tab change never inherits what belonged
 * to the previous tab. A tab's own params (e.g. a view inside it) belong to a tab-level hook such
 * as `useUrlParam`, not here.
 */
export function useUrlTab(
  validIds: string[],
  defaultId: string,
): [string, (id: string, params?: Record<string, string>) => void] {
  const readTab = () => {
    const param = new URLSearchParams(window.location.search).get('tab')
    return param && validIds.includes(param) ? param : defaultId
  }

  const [tab, setTabState] = useState(readTab)

  useEffect(() => {
    const onPopState = () => setTabState(readTab())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readTab is stable enough for a popstate handler
  }, [])

  const setTab = (id: string, params: Record<string, string> = {}) => {
    setTabState(id)
    const query = new URLSearchParams({ tab: id })
    for (const [key, value] of Object.entries(params)) if (key !== 'tab') query.set(key, value)
    pushSearchParams(query)
  }

  return [tab, setTab]
}
