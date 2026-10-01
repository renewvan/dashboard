import { useEffect, useState } from 'react'

export type SettingsNavStyle = 'sheet' | 'subpage'

const STORAGE_KEY = 'renewvan-dashboard-settings-nav-style'

/** 'subpage' needs no theming workaround (nothing leaves the themed DOM
 * subtree) and is the simpler default; 'sheet' is kept as a real,
 * user-selectable alternative per explicit request -- not a dev-only
 * toggle, pending a real touch-display trial of both. */
const DEFAULT_NAV_STYLE: SettingsNavStyle = 'subpage'

function isNavStyle(value: string | null): value is SettingsNavStyle {
  return value === 'sheet' || value === 'subpage'
}

function readStoredNavStyle(): SettingsNavStyle {
  if (typeof window === 'undefined') return DEFAULT_NAV_STYLE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return isNavStyle(stored) ? stored : DEFAULT_NAV_STYLE
}

/**
 * How the Settings tab navigates into the Display/Network groups: `sheet`
 * (each group opens a slide-in flyout, stackable for nested settings) or
 * `subpage` (each group replaces the view in place, with a back chevron).
 * Persisted like `useTheme`, so the choice survives a reload.
 */
export function useSettingsNavStyle(): [SettingsNavStyle, (style: SettingsNavStyle) => void] {
  const [navStyle, setNavStyle] = useState<SettingsNavStyle>(readStoredNavStyle)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, navStyle)
  }, [navStyle])

  return [navStyle, setNavStyle]
}
