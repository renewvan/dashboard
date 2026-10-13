import { useEffect, useState } from 'react'

export type SettingsNavStyle = 'drawer' | 'subpage'

const STORAGE_KEY = 'renewvan-dashboard-settings-nav-style'

/** 'subpage' needs no theming workaround (nothing leaves the themed DOM
 * subtree) and is the simpler default; 'drawer' stays a real, user-selectable
 * alternative, pending a real touch-display trial of both. */
const DEFAULT_NAV_STYLE: SettingsNavStyle = 'subpage'

function readStoredNavStyle(): SettingsNavStyle {
  if (typeof window === 'undefined') return DEFAULT_NAV_STYLE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  // `'sheet'` is what this choice was stored as before it was renamed to drawer; keep
  // honouring it so a kiosk that picked it is not silently reset to subpages.
  if (stored === 'sheet') return 'drawer'
  return stored === 'drawer' || stored === 'subpage' ? stored : DEFAULT_NAV_STYLE
}

/**
 * How the Settings page opens its deeper views: `drawer` (each view slides in
 * from the right over the page) or `subpage` (each view replaces the page,
 * under a breadcrumb trail). Persisted like `useTheme`, so the kiosk's choice
 * survives a reload.
 *
 * Returns the STORED choice. The phone override (always subpage) is derived by
 * the caller at render and must never be passed to `setStyle`, or it would
 * overwrite the kiosk's choice.
 */
export function useSettingsNavStyle(): [SettingsNavStyle, (style: SettingsNavStyle) => void] {
  const [navStyle, setNavStyle] = useState<SettingsNavStyle>(readStoredNavStyle)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, navStyle)
  }, [navStyle])

  return [navStyle, setNavStyle]
}
