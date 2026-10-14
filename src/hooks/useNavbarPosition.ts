import { useEffect, useState } from 'react'

export type NavbarPosition = 'left' | 'bottom'

const STORAGE_KEY = 'renewvan-dashboard-navbar-position'

const DEFAULT_NAVBAR_POSITION: NavbarPosition = 'left'

function readStoredNavbarPosition(): NavbarPosition {
  if (typeof window === 'undefined') return DEFAULT_NAVBAR_POSITION
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === 'left' || stored === 'bottom' ? stored : DEFAULT_NAVBAR_POSITION
}

/**
 * Where the kiosk's primary navigation lives: `left` (a closed icon rail beside the
 * pages) or `bottom` (an auto-hiding bar under them). Kiosk-local preference with no bus
 * topic, persisted like `useTheme` so the choice survives a reload/power cycle.
 *
 * Returns the STORED choice. The phone override (always a bottom bar) is derived by the
 * caller at render and must never be passed to `setPosition`, or it would overwrite the
 * kiosk's choice.
 */
export function useNavbarPosition(): [NavbarPosition, (position: NavbarPosition) => void] {
  const [position, setPosition] = useState<NavbarPosition>(readStoredNavbarPosition)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, position)
  }, [position])

  return [position, setPosition]
}
