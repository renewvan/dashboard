import { useEffect, useState } from 'react'
import { pushSearchParams } from '@/lib/urlHistory'

/**
 * Syncs the active tab with the URL's `?tab=` search param via the native
 * History API. No router library: the kiosk has a flat, un-nested set of
 * tabs (see `NAV_ITEMS` in `App.tsx`), so `pushState`/`popstate` covers
 * deep-linking and back/forward without pulling in react-router et al.
 *
 * `setTab(id, params)` pushes ONE history entry (none if the URL would not change, e.g. a re-tap
 * of the selected tab) carrying the current query with `tab` set to `id`
 * and `params` applied on top: a string sets that param, `null` removes it. Every other param is
 * kept, so the hook never discards what it does not know about; a caller that has per-tab params
 * (e.g. a view inside a tab) names them with `null` when it switches tabs. Writing those params
 * belongs to a tab-level hook such as `useUrlParam`, not here.
 */
export function useUrlTab(
  validIds: string[],
  defaultId: string,
): [string, (id: string, params?: Record<string, string | null>) => void] {
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

  const setTab = (id: string, params: Record<string, string | null> = {}) => {
    setTabState(id)
    const query = new URLSearchParams(window.location.search)
    query.set('tab', id)
    for (const [key, value] of Object.entries(params)) {
      if (key === 'tab') continue
      if (value === null) query.delete(key)
      else query.set(key, value)
    }
    if (query.toString() !== new URLSearchParams(window.location.search).toString()) {
      pushSearchParams(query)
    }
  }

  return [tab, setTab]
}
