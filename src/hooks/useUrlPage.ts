import { useEffect, useState } from 'react'
import { pushSearchParams } from '@/lib/urlHistory'

/**
 * Syncs the active page with the URL's `?page=` search param via the native
 * History API. No router library: the kiosk has a flat, un-nested set of
 * pages (see `NAV_ITEMS` in `App.tsx`), so `pushState`/`popstate` covers
 * deep-linking and back/forward without pulling in react-router et al.
 *
 * `setPage(id, params)` pushes ONE history entry (none if the URL would not change, e.g. a re-tap
 * of the selected page) carrying the current query with `page` set to `id`
 * and `params` applied on top: a string sets that param, `null` removes it. Every other param is
 * kept, so the hook never discards what it does not know about; a caller that has per-page params
 * (e.g. a view inside a page) names them with `null` when it switches pages. Writing those params
 * belongs to a page-level hook such as `useUrlParam`, not here.
 */
export function useUrlPage(
  validIds: string[],
  defaultId: string,
): [string, (id: string, params?: Record<string, string | null>) => void] {
  const readPage = () => {
    const param = new URLSearchParams(window.location.search).get('page')
    return param && validIds.includes(param) ? param : defaultId
  }

  const [page, setPageState] = useState(readPage)

  useEffect(() => {
    const onPopState = () => setPageState(readPage())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- readPage is stable enough for a popstate handler
  }, [])

  const setPage = (id: string, params: Record<string, string | null> = {}) => {
    setPageState(id)
    const query = new URLSearchParams(window.location.search)
    query.set('page', id)
    for (const [key, value] of Object.entries(params)) {
      if (key === 'page') continue
      if (value === null) query.delete(key)
      else query.set(key, value)
    }
    if (query.toString() !== new URLSearchParams(window.location.search).toString()) {
      pushSearchParams(query)
    }
  }

  return [page, setPage]
}
