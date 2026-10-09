import { useEffect, useState } from 'react'

const STORAGE_KEY = 'renewvan-dashboard-sidebar-collapsed'

/** Expanded (icon + label) by default so a fresh kiosk shows labelled nav. */
const DEFAULT_COLLAPSED = false

function readStoredCollapsed(): boolean {
  if (typeof window === 'undefined') return DEFAULT_COLLAPSED
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === null ? DEFAULT_COLLAPSED : stored === 'true'
}

/**
 * Whether the kiosk sidebar is collapsed to its icon-only rail. Kiosk-local
 * preference with no bus topic, persisted like `useTheme` so the choice
 * survives a reload/power cycle.
 */
export function useSidebarCollapsed(): [boolean, (collapsed: boolean) => void] {
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed])

  return [collapsed, setCollapsed]
}
