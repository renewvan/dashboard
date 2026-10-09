import { useEffect, useRef, useState } from 'react'
import { ToastPrimitive } from '@/components/ui/toast'

/**
 * Header badge count for `AlertsButton` — deliberately *not* derived from
 * `toasts.length` (the live, currently-active toast count): dismissing a
 * toast early via its own `×` would then instantly shrink the badge,
 * which reads as "the alert went away" even though the driver never
 * actually looked at it. (`AlertsTab`'s own row `×` is unrelated to this
 * count — it removes a `localStorage` history entry, not a live toast.)
 * Per explicit request, the badge should only clear once the driver
 * visits the Alerts tab.
 *
 * Tracks every toast id ever seen (via a ref, so re-renders don't reset
 * it) and increments the unseen count by one each time a *new* id shows
 * up in `toastManager`'s live list — once per alert, regardless of how
 * long it stays or how it's dismissed. If a new alert arrives while the
 * Alerts tab is already the active tab, it doesn't bump the count (the
 * driver is looking right at it). Visiting the Alerts tab (`activeTab`
 * becoming `'alerts'`) resets the count to zero.
 */
export function useUnseenAlertCount(activeTab: string): number {
  const { toasts } = ToastPrimitive.useToastManager()
  const knownIds = useRef(new Set<string>())
  const [count, setCount] = useState(0)

  useEffect(() => {
    const newIds = toasts.map((t) => t.id).filter((id) => !knownIds.current.has(id))
    if (newIds.length === 0) return
    for (const id of newIds) knownIds.current.add(id)
    if (activeTab !== 'alerts') {
      setCount((c) => c + newIds.length)
    }
  }, [toasts, activeTab])

  useEffect(() => {
    if (activeTab === 'alerts') setCount(0)
  }, [activeTab])

  return count
}
