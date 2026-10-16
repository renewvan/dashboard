import { useEffect, useState } from 'react'

const STORAGE_KEY = 'renewvan-dashboard-demo-mode'

/** Off by default: a real van must never silently show fake data. */
const DEFAULT_DEMO_MODE = false

function readStoredDemoMode(): boolean {
  if (typeof window === 'undefined') return DEFAULT_DEMO_MODE
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return stored === null ? DEFAULT_DEMO_MODE : stored === 'true'
}

/**
 * Whether the dashboard reads the simulated van (`renewvan-demo/` topics,
 * hub `docs/demo-mode.md`) instead of the real one — Settings → General →
 * Demo mode. Kiosk-local preference with no bus topic, persisted like
 * `useAlertsEnabled` so the choice survives a reload/power cycle. It only
 * picks which root `useRenewvanBus` subscribes to; nothing on the Pi starts
 * or stops.
 *
 * Single instance; call once in `App` (each call owns its own state, so a
 * second one would drift from the bus).
 */
export function useDemoMode(): [boolean, (demo: boolean) => void] {
  const [demo, setDemo] = useState<boolean>(readStoredDemoMode)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, String(demo))
  }, [demo])

  return [demo, setDemo]
}
