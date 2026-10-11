import { useCallback, useEffect, useState } from 'react'
import { pushSearchParams, URL_CHANGE_EVENT } from '@/lib/urlHistory'

/**
 * Mirrors one `?name=` search param, restricted to `validValues`: anything else (missing or
 * unknown) reads as `null`. Writing pushes one history entry (`null` removes the param) and keeps
 * every other param, so Back and Forward walk the values. The value follows `popstate` and
 * in-app pushes made elsewhere (`URL_CHANGE_EVENT`), so a link opened while this hook is mounted
 * is picked up too. `validValues` must be a stable array (a module constant).
 */
export function useUrlParam<T extends string>(
  name: string,
  validValues: readonly T[],
): [T | null, (value: T | null) => void] {
  const read = useCallback((): T | null => {
    const param = new URLSearchParams(window.location.search).get(name)
    return validValues.find((value) => value === param) ?? null
  }, [name, validValues])

  const [value, setValue] = useState(read)

  useEffect(() => {
    const sync = () => setValue(read())
    // Resync in case the URL changed between the first render and this effect.
    sync()
    window.addEventListener('popstate', sync)
    window.addEventListener(URL_CHANGE_EVENT, sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener(URL_CHANGE_EVENT, sync)
    }
  }, [read])

  const write = useCallback(
    (next: T | null) => {
      if (next === read()) return
      const params = new URLSearchParams(window.location.search)
      if (next === null) params.delete(name)
      else params.set(name, next)
      pushSearchParams(params)
    },
    [name, read],
  )

  return [value, write]
}
