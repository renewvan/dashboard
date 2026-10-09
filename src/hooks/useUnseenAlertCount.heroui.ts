import { toastQueue } from '@heroui/react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

const subscribe = (onChange: () => void) => toastQueue.subscribe(onChange)
const getSnapshot = () => toastQueue.visibleToasts

/**
 * Header badge count for `AlertsButton` — deliberately *not* derived from
 * the live toast count: dismissing a toast early via its own `×` would
 * then instantly shrink the badge, which reads as "the alert went away"
 * even though the driver never actually looked at it. (`AlertsTab`'s own
 * row `×` is unrelated to this count — it removes a `localStorage`
 * history entry, not a live toast.) Per explicit request, the badge
 * should only clear once the driver visits the Alerts tab.
 *
 * Tracks every toast key ever seen (via a ref, so re-renders don't reset
 * it) and increments the unseen count by one each time a *new* key shows
 * up in HeroUI's `toastQueue` — once per alert, regardless of how long it
 * stays or how it's dismissed. The queue's `visibleToasts` keeps every
 * toast (including ones still animating out; `maxVisibleToasts` on the
 * provider is visual only), so counting is by new key, never by length.
 * If a new alert arrives while the Alerts tab is already the active tab,
 * it doesn't bump the count (the driver is looking right at it). Visiting
 * the Alerts tab (`activeTab` becoming `'alerts'`) resets the count to
 * zero.
 */
export function useUnseenAlertCount(activeTab: string): number {
  const toasts = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  const knownKeys = useRef(new Set<string>())
  const [count, setCount] = useState(0)

  useEffect(() => {
    const newKeys = toasts.map((t) => t.key).filter((key) => !knownKeys.current.has(key))
    if (newKeys.length === 0) return
    for (const key of newKeys) knownKeys.current.add(key)
    if (activeTab !== 'alerts') {
      setCount((c) => c + newKeys.length)
    }
  }, [toasts, activeTab])

  useEffect(() => {
    if (activeTab === 'alerts') setCount(0)
  }, [activeTab])

  return count
}
