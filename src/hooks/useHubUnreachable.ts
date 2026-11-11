import { useEffect, useState } from 'react'
import type { ConnectionStatus } from '@/hooks/useRenewvanBus'

/** How long the broker link may stay down before the app says the hub is unreachable. */
export const UNREACHABLE_AFTER_MS = 10_000

/**
 * True once the broker link has been down (connecting or disconnected) for `delayMs` without a break.
 * Short of that a reconnect blip shows nothing, and any `connected` clears it at once. `enabled` is off
 * where the answer is not wanted (Demo mode, which needs no hub).
 */
export function useHubUnreachable(
  status: ConnectionStatus,
  enabled = true,
  delayMs = UNREACHABLE_AFTER_MS,
): boolean {
  const [unreachable, setUnreachable] = useState(false)
  const down = enabled && status !== 'connected'
  useEffect(() => {
    if (!down) return
    const timer = setTimeout(() => setUnreachable(true), delayMs)
    return () => {
      clearTimeout(timer)
      setUnreachable(false) // the next outage starts its own countdown
    }
  }, [down, delayMs])
  return down && unreachable
}

/**
 * The kiosk loads the dashboard from the Pi itself (`http://localhost`), so when the broker is down
 * there the Pi is the problem and no Bluetooth wake from it makes sense.
 */
export function isKioskHost(hostname = window.location.hostname): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1'
}
