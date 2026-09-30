import { useEffect, useRef } from 'react'
import { appendAlertHistoryEntry, resolveAlertHistoryEntry } from '../lib/alertHistory'
import { toastManager } from '../components/ui/toast'
import { isCompleteTank, type RenewvanBusState, type Tank } from '../types'
import type { ConnectionStatus, TailscaleStatus } from './useRenewvanBus'

// Mirrors TanksTab.tsx's own fluid-label copy — kept local rather than a
// shared import since no shared tank-labels module exists at this commit.
const FLUID_LABELS: Record<Tank['fluid_type'], string> = {
  fresh_water: 'Fresh water',
  grey_water: 'Grey water',
  black_water: 'Black water',
  fuel: 'Fuel',
  lpg: 'LPG',
}

// Turns backend-published alert state into toast add/remove plus a
// persistent history entry (`lib/alertHistory.ts`), per wayfinder
// tickets 04 (backend-published state, not client-derived thresholds), 05
// (tank alarm_state -> critical, state-driven dismiss) and 06 (MQTT/
// Tailscale disconnect -> warning, state-driven dismiss). See
// .scratch/alert-system/map.md.
//
// `toastManager` has no "toast per entity, upsert on change" primitive —
// `add()` always mints a new id. This hook is that missing mechanism: a
// ref keyed by a stable alert key (`tank:<id>`, `mqtt-connection`,
// `tailscale-connection`) tracks the live toast id *and* the
// corresponding history entry id for each currently-active alert,
// diffed against the previous bus state on every render.
//
// All alerts here are state-driven (kiosk requirement: must not silently
// disappear while the real condition persists — see map.md's kiosk-context
// note), so every toast uses `timeout: 0` regardless of severity; the
// toast itself only ever closes by this hook (once the backend state
// clears) or by the user dismissing it early via the toast's own close
// control — either way, the matching history entry is left in place
// (just marked resolved on the former), not removed: removal is only
// ever an explicit action in the Alerts tab itself (`AlertsTab.tsx`).

interface AlertContent {
  type: 'error' | 'warning'
  title: string
  description: string
}

interface ActiveAlert {
  toastId: string
  historyId: string
}

interface AlertToastArgs {
  tanks: RenewvanBusState['tanks']
  status: ConnectionStatus
  tailscale: TailscaleStatus | null
}

export function useAlertToasts({ tanks, status, tailscale }: AlertToastArgs): void {
  const activeToasts = useRef(new Map<string, ActiveAlert>())

  useEffect(() => {
    const active = activeToasts.current
    const desired = new Map<string, AlertContent>()

    for (const [id, tank] of Object.entries(tanks)) {
      if (!isCompleteTank(tank) || tank.alarm_state !== 'alarm') continue
      desired.set(`tank:${id}`, {
        type: 'error',
        title: `${FLUID_LABELS[tank.fluid_type]} tank alarm`,
        description: 'Level requires attention.',
      })
    }

    if (status === 'disconnected') {
      desired.set('mqtt-connection', {
        type: 'warning',
        title: 'Hub connection lost',
        description: 'Live data may be out of date.',
      })
    }

    if (tailscale !== null && !tailscale.connected) {
      desired.set('tailscale-connection', {
        type: 'warning',
        title: 'Tailscale disconnected',
        description: 'Remote access is unavailable.',
      })
    }

    // Deferred to a microtask: `ToastProvider` registers its subscription
    // to `toastManager` in its own `useEffect`, which — since effects run
    // child-before-parent — hasn't run yet during this hook's own effect
    // on the very first commit (e.g. a tank already in `alarm_state` on
    // page load). Calling `add()`/`close()` synchronously here fires into
    // an empty listener set and the toast is silently dropped. Effects
    // for one commit all run synchronously within a single task, so a
    // microtask queued from here always runs after the whole tree
    // (including the Provider's subscribe effect) has flushed.
    queueMicrotask(() => {
      for (const [key, alert] of active) {
        if (!desired.has(key)) {
          toastManager.close(alert.toastId)
          resolveAlertHistoryEntry(alert.historyId)
          active.delete(key)
        }
      }
      for (const [key, content] of desired) {
        if (!active.has(key)) {
          const toastId = toastManager.add({ ...content, timeout: 0 })
          const historyId = appendAlertHistoryEntry({ key, ...content })
          active.set(key, { toastId, historyId })
        }
      }
    })
  }, [tanks, status, tailscale])
}
