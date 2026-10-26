import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * The previous `value` while it is shallow-equal to it (same keys, each `Object.is`-equal), else the
 * new one. Replaces a `useMemo` whose dependency list repeats every field of an object literal:
 * build the object each render and this keeps its reference until a field really changes, so a
 * field added later can never be forgotten from a list.
 */
export function useShallowStable<T extends object>(value: T): T {
  const [stable, setStable] = useState(value)
  if (shallowEqual(stable, value)) return stable
  // Adjusting state while rendering: React re-renders at once with `value` as the kept one.
  setStable(value)
  return value
}

/**
 * The previous `value` while its JSON is unchanged. For records that arrive as a fresh object on
 * every message but only rarely hold a different content.
 */
export function useContentStable<T>(value: T): T {
  const key = JSON.stringify(value)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the content of `value`
  return useMemo(() => value, [key])
}

function shallowEqual(a: object, b: object): boolean {
  const aKeys = Object.keys(a)
  if (aKeys.length !== Object.keys(b).length) return false
  return aKeys.every(
    (key) =>
      Object.hasOwn(b, key) &&
      Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]),
  )
}

/**
 * A function with a stable identity that always calls the latest `fn`. For handlers handed to a
 * memoised value (a context, a `memo` child) that would otherwise change every render because `fn`
 * closes over state or over a setter recreated each render.
 */
export function useStableCallback<Args extends unknown[], R>(
  fn: (...args: Args) => R,
): (...args: Args) => R {
  const ref = useRef(fn)
  useEffect(() => {
    ref.current = fn
  })
  return useCallback((...args: Args) => ref.current(...args), [])
}
