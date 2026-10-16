import { toast } from '@heroui/react'
import { useEffect, useRef } from 'react'
import {
  acknowledgeAlertHistoryEntry,
  appendAlertHistoryEntry,
  resolveAlertHistoryEntry,
} from '@/lib/alertHistory'
import { FLUID_LABELS } from '@/lib/tank-labels'
import { isCompleteTank, type RenewvanBusState } from '@/types'
import type { ConnectionStatus, TailscaleStatus } from './useRenewvanBus'

// Turns backend-published alert state into toast add/remove plus a
// persistent history entry (`lib/alertHistory.ts`), per wayfinder
// tickets 04 (backend-published state, not client-derived thresholds), 05
// (tank alarm_state -> critical, state-driven dismiss) and 06 (MQTT/
// Tailscale disconnect -> warning, state-driven dismiss). See
// .scratch/alert-system/map.md.
//
// HeroUI's `toast.*` has no "toast per entity, upsert on change" primitive
// here — each call always mints a new id. This hook is that mechanism: a
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
// control. "Acknowledged" (`lib/alertHistory.ts`'s `acknowledgedAt`)
// means specifically the latter: the driver dismissed the toast while
// the alert was still open, before the backend condition cleared on its
// own. Distinguishing the two closes both go through the toast's single
// `onClose` callback (HeroUI fires it for `toast.close(id)` too), so a
// `programmaticCloses` ref records which toast ids *this hook* is closing
// (the resolved path) right before calling `close()`; `onClose` checks
// that set and only acknowledges when the id isn't in it — i.e. the close
// wasn't this hook's own doing, so it must have been the user.

interface AlertContent {
  type: 'error' | 'warning'
  title: string
  description: string
}

interface ActiveAlert {
  /** `null` while toasts are disabled: the alert is still tracked and
   * recorded in history, it just has no on-screen toast. */
  toastId: string | null
  /** `null` for a demo alert: it is shown, but never written to the persistent history. */
  historyId: string | null
  content: AlertContent
}

interface AlertToastArgs {
  tanks: RenewvanBusState['tanks']
  status: ConnectionStatus
  tailscale: TailscaleStatus | null
  /** Kiosk preference (`useAlertsEnabled`): `false` suppresses toasts only —
   * alert history keeps recording so nothing is lost while muted. */
  enabled: boolean
  /** Demo mode (the shared bus flag): `tanks` is the simulated van. Its alerts still toast, so the
   * alert UI can be developed against it, but are never written to the persistent history: a fake
   * "Grey water tank alarm" must not outlive the demo on the Alerts page. */
  demo?: boolean
}

export function useAlertToasts({
  tanks,
  status,
  tailscale,
  enabled,
  demo = false,
}: AlertToastArgs): void {
  const activeToasts = useRef(new Map<string, ActiveAlert>())
  const programmaticCloses = useRef(new Set<string>())
  const lastDemo = useRef(demo)
  // The real van's tank alerts, set aside while demo mode shows the simulated one. Their history
  // ids are kept so that when the real van comes back and the same alarm is still open, the diff
  // finds it already tracked instead of recording it a second time.
  const parkedRealTankAlerts = useRef(new Map<string, ActiveAlert>())

  useEffect(() => {
    const active = activeToasts.current
    const desired = new Map<string, AlertContent>()

    // Switching demo mode swaps the van under this hook. Tank alerts belong to whichever van is on
    // screen, so on a switch they are taken out of play and their toasts closed WITHOUT touching
    // history: letting the diff below treat them as "cleared" would resolve a real alarm just
    // because someone looked at the demo.
    //  - Into demo: the real van's tank alerts are parked (history ids kept), and restored when
    //    the real van returns. If the same alarm is still open the diff then finds it tracked and
    //    does nothing; if it cleared in the meantime the diff resolves it, which is correct.
    //  - Out of demo: the demo alerts have no history entry and are simply discarded.
    // Connection alerts are about the real hub link and real Tailscale whatever van is on screen,
    // so they stay tracked (dropping them would append a duplicate row for the same outage).
    if (lastDemo.current !== demo) {
      lastDemo.current = demo
      for (const [key, alert] of active) {
        if (!key.startsWith('tank:')) continue
        if (alert.toastId !== null) {
          programmaticCloses.current.add(alert.toastId)
          toast.close(alert.toastId)
        }
        active.delete(key)
        if (demo) parkedRealTankAlerts.current.set(key, { ...alert, toastId: null })
      }
      if (!demo) {
        for (const [key, alert] of parkedRealTankAlerts.current) active.set(key, alert)
        parkedRealTankAlerts.current.clear()
      }
    }

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

    const showToast = (key: string, alert: ActiveAlert) => {
      const options = {
        description: alert.content.description,
        timeout: 0,
        onClose: () => {
          // Fires for every close, including this hook's own `toast.close()`
          // calls (resolved / muted paths) — only acknowledge when *this*
          // toast id wasn't the one we just marked as a programmatic close.
          if (programmaticCloses.current.delete(toastId)) return
          if (alert.historyId !== null) acknowledgeAlertHistoryEntry(alert.historyId)
        },
      }
      const toastId =
        alert.content.type === 'error'
          ? toast.danger(alert.content.title, options)
          : toast.warning(alert.content.title, options)
      active.set(key, { ...alert, toastId })
    }

    for (const [key, alert] of active) {
      if (!desired.has(key)) {
        if (alert.toastId !== null) {
          programmaticCloses.current.add(alert.toastId)
          toast.close(alert.toastId)
        }
        if (alert.historyId !== null) resolveAlertHistoryEntry(alert.historyId)
        active.delete(key)
      } else if (!enabled && alert.toastId !== null) {
        // Muted while the alert is still open: drop the toast without
        // acknowledging it (the driver didn't dismiss it).
        programmaticCloses.current.add(alert.toastId)
        toast.close(alert.toastId)
        active.set(key, { ...alert, toastId: null })
      } else if (enabled && alert.toastId === null) {
        // Un-muted while the alert is still open: surface it again.
        showToast(key, alert)
      }
    }
    for (const [key, content] of desired) {
      if (!active.has(key)) {
        const historyId = demo ? null : appendAlertHistoryEntry({ key, ...content })
        const alert: ActiveAlert = { toastId: null, historyId, content }
        active.set(key, alert)
        if (enabled) showToast(key, alert)
      }
    }
  }, [tanks, status, tailscale, enabled, demo])
}
