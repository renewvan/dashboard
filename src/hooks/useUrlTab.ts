import { useEffect, useState } from 'react'

/**
 * Syncs the active tab with the URL's `?tab=` search param via the native
 * History API. No router library: the kiosk has a flat, un-nested set of
 * tabs (see `NAV_ITEMS` in `App.tsx`), so `pushState`/`popstate` covers
 * deep-linking and back/forward without pulling in react-router et al.
 */
export function useUrlTab(validIds: string[], defaultId: string): [string, (id: string) => void] {
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

  const setTab = (id: string) => {
    setTabState(id)
    const params = new URLSearchParams(window.location.search)
    params.set('tab', id)
    window.history.pushState(null, '', `${window.location.pathname}?${params}`)
  }

  return [tab, setTab]
}
