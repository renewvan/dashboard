import { useEffect, useState } from 'react'
import {
  CloudOff,
  Loader2,
  Signal,
  SignalHigh,
  SignalLow,
  SignalMedium,
  SignalZero,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { RouterHealth, TailscaleStatus } from '../hooks/useRenewvanBus'
import { connectionTier, type ConnectionTier } from '../lib/connection'
import { tailscaleStatusText } from '../lib/tailscale'
import type { Router } from '../types'
import { IconStatusButton } from './IconStatusButton'

export interface UplinkStatusButtonProps {
  /** `state.routers[id]` — partial between retained messages, deliberately (see types.ts). */
  router: Partial<Router> | undefined
  routerHealth: RouterHealth | null
  /** `state.routerUpdatedAt[id]`, epoch ms — feeds the staleness rule. */
  lastReceivedAt: number | undefined
  tailscale: TailscaleStatus | null
  onOpenSettings: () => void
}

interface TierPresentation {
  Icon: LucideIcon
  iconClass: string
  label: string
}

/**
 * Header button for the van's uplink (`CONTEXT.md`) — the cellular
 * connection through the router entity (`renewvan/router/<id>/*`), not the
 * kiosk's bus link (`RouterStatusIcon`). One morphing five-bar icon whose
 * tier comes from `connectionTier` (lib/connection.ts owns the bands and
 * the offline/staleness rules; glyph set per the router-connection-icon
 * prototype decision). `CloudOff` stays reserved exclusively for this
 * button so the two red header icons never share a shape.
 */
function present(tier: ConnectionTier): TierPresentation {
  switch (tier) {
    case 'bars-4':
      return { Icon: SignalHigh, iconClass: 'text-success', label: 'Connection: 4 of 5 bars' }
    case 'bars-3':
      return { Icon: Signal, iconClass: 'text-success', label: 'Connection: 3 of 5 bars' }
    case 'bars-2':
      return {
        Icon: SignalMedium,
        iconClass: 'text-warning',
        label: 'Connection: 2 of 5 bars',
      }
    case 'bars-1':
      return { Icon: SignalLow, iconClass: 'text-warning', label: 'Connection: 1 of 5 bars' }
    case 'no-service':
      return { Icon: SignalZero, iconClass: 'text-destructive', label: 'Connection: no service' }
    case 'offline':
      return { Icon: CloudOff, iconClass: 'text-destructive', label: 'Connection offline' }
    default:
      return {
        Icon: Loader2,
        iconClass: 'text-warning animate-spin',
        label: 'Checking connection…',
      }
  }
}

/** Re-render on a slow tick so the icon degrades to offline on staleness
 * even when no other bus traffic arrives to re-render the header. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
  return now
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit += 1
  } while (value >= 1024 && unit < units.length - 1)
  return `${value.toFixed(1)} ${units[unit]}`
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-muted-foreground flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-foreground">{value ?? '—'}</span>
    </div>
  )
}

export function UplinkStatusButton({
  router,
  routerHealth,
  lastReceivedAt,
  tailscale,
  onOpenSettings,
}: UplinkStatusButtonProps) {
  const now = useNow(30_000)
  const tier = connectionTier(router?.signal_rsrp_dbm, routerHealth, lastReceivedAt, now)
  const { Icon, iconClass, label } = present(tier)

  return (
    <IconStatusButton
      label={label}
      data-testid="uplink-status-button"
      data-state={tier}
      icon={<Icon className={`size-5 ${iconClass}`} />}
      onOpenSettings={onOpenSettings}
      popoverContent={
        <div className="flex flex-col gap-1.5">
          {tier === 'checking' ? (
            'Checking…'
          ) : tier === 'offline' ? (
            <div className="font-medium">Offline</div>
          ) : (
            <>
              <div className="font-medium">
                {`${(router?.network_type ?? 'unknown').toUpperCase()} · ${router?.operator ?? '—'}`}
              </div>
              <FieldRow
                label="RSRP"
                value={
                  router?.signal_rsrp_dbm !== undefined ? `${router.signal_rsrp_dbm} dBm` : null
                }
              />
              <FieldRow
                label="Data this month"
                value={
                  router?.data_used_month_rx_b !== undefined &&
                  router?.data_used_month_tx_b !== undefined
                    ? `↓ ${formatBytes(router.data_used_month_rx_b)} · ↑ ${formatBytes(router.data_used_month_tx_b)}`
                    : null
                }
              />
            </>
          )}
          <FieldRow label="Tailscale" value={tailscaleStatusText(tailscale)} />
        </div>
      }
    />
  )
}
