import { useEffect, useRef } from 'react'
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

// Turns backend-published alert state into toast add/remove, per wayfinder
// tickets 04 (backend-published state, not client-derived thresholds), 05
// (tank alarm_state -> critical, state-driven dismiss) and 06 (MQTT/
// Tailscale disconnect -> warning, state-driven dismiss). See
// .scratch/alert-system/map.md.
//
// `toastManager` has no "toast per entity, upsert on change" primitive —
// `add()` always mints a new id. This hook is that missing mechanism: a
// ref keyed by a stable alert key (`tank:<id>`, `mqtt-connection`,
// `tailscale-connection`) tracks the live toast id for each currently-
// active alert, diffed against the previous bus state on every render.
//
// All alerts here are state-driven (kiosk requirement: must not silently
// disappear while the real condition persists — see map.md's kiosk-context
// note), so every toast uses `timeout: 0` regardless of severity; removal
// only ever happens by this hook closing it once the backend state clears,
// or by the user dismissing it early via the toast's own close control.

interface AlertToastArgs {
  tanks: RenewvanBusState['tanks']
  status: ConnectionStatus
  tailscale: TailscaleStatus | null
}

export function useAlertToasts({ tanks, status, tailscale }: AlertToastArgs): void {
  const activeToasts = useRef(new Map<string, string>())

  useEffect(() => {
    const active = activeToasts.current
    const desired = new Map<string, () => string>()

    for (const [id, tank] of Object.entries(tanks)) {
      if (!isCompleteTank(tank) || tank.alarm_state !== 'alarm') continue
      desired.set(`tank:${id}`, () =>
        toastManager.add({
          type: 'error',
          title: `${FLUID_LABELS[tank.fluid_type]} tank alarm`,
          description: 'Level requires attention.',
          timeout: 0,
        }),
      )
    }

    if (status === 'disconnected') {
      desired.set('mqtt-connection', () =>
        toastManager.add({
          type: 'warning',
          title: 'Hub connection lost',
          description: 'Live data may be out of date.',
          timeout: 0,
        }),
      )
    }

    if (tailscale !== null && !tailscale.connected) {
      desired.set('tailscale-connection', () =>
        toastManager.add({
          type: 'warning',
          title: 'Tailscale disconnected',
          description: 'Remote access is unavailable.',
          timeout: 0,
        }),
      )
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
      for (const [key, id] of active) {
        if (!desired.has(key)) {
          toastManager.close(id)
          active.delete(key)
        }
      }
      for (const [key, add] of desired) {
        if (!active.has(key)) {
          active.set(key, add())
        }
      }
    })
  }, [tanks, status, tailscale])
}
