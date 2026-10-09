import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'renewvan-dashboard-theme'

/** The kiosk's original always-on look (ticket 05), kept as the default for
 * anyone who's never touched the toggle. */
const DEFAULT_THEME: Theme = 'dark'

function isTheme(value: string | null): value is Theme {
  return value === 'light' || value === 'dark'
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isTheme(stored) ? stored : DEFAULT_THEME
}

/**
 * Kiosk theme preference — defaults to dark but is user-toggleable from
 * Settings. Applies instantly (no reboot needed); persisted to
 * `localStorage` so the choice survives a reload/power cycle.
 */
export function useTheme(): [Theme, (theme: Theme) => void] {
  const [theme, setTheme] = useState<Theme>(readStoredTheme)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, theme)
    document.documentElement.dataset.theme = theme
  }, [theme])

  return [theme, setTheme]
}
