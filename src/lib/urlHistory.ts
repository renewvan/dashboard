/**
 * Dispatched on `window` after every in-app URL write. `pushState` emits no `popstate`, so hooks
 * that mirror the query (`useUrlPage`, `useUrlParam`) listen to this to pick up a push made by
 * another hook instance or by `App` while they stay mounted.
 */
export const URL_CHANGE_EVENT = 'renewvan:urlchange'

/** Pushes one history entry for `params` on the current path and announces it. */
export function pushSearchParams(params: URLSearchParams) {
  const query = params.toString()
  window.history.pushState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  window.dispatchEvent(new Event(URL_CHANGE_EVENT))
}
