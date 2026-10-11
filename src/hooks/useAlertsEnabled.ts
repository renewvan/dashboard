import { useEffect, useState } from 'react'

const STORAGE_KEY = 'renewvan-dashboard-alerts-enabled'

/** On by default: a safety alert must never be silently off on a fresh kiosk. */
const DEFAULT_ALERTS_ENABLED = true

function readStoredAlertsEnabled(): boolean {
  if (typeof window === 'undefined') return DEFAULT_ALERTS_ENABLED
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === null ? DEFAULT_ALERTS_ENABLED : stored === 'true'
}

/**
 * Whether alert toasts (`useAlertToasts`) are shown — Settings → General →
 * Alerts. Kiosk-local preference with no bus topic, persisted like
 * `useTheme` so the choice survives a reload/power cycle. Mutes toasts
 * only; the Alerts tab's history keeps recording.
 *
 * Single instance; call once in `App` (each call owns its own state, so a
 * second one would drift from the toasts).
 */
export function useAlertsEnabled(): [boolean, (enabled: boolean) => void] {
  const [enabled, setEnabled] = useState<boolean>(readStoredAlertsEnabled)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(enabled))
  }, [enabled])

  return [enabled, setEnabled]
}
