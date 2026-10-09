import { CloudOff, Loader2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNow } from '@/hooks/useNow'
import type { ConnectionStatus, RouterHealth, TailscaleStatus } from '@/hooks/useRenewvanBus'
import {
  busStatusText,
  connectionTier,
  uplinkHeadline,
  type ConnectionTier,
} from '@/lib/connection'
import { formatBytes } from '@/lib/format'
import { tailscaleStatusText } from '@/lib/tailscale'
import type { Router } from '@/types'
import { IconStatusButton } from './IconStatusButton.heroui'

export interface UplinkStatusButtonProps {
  /** `state.routers[id]` — partial between retained messages, deliberately (see types.ts). */
  router: Partial<Router> | undefined
  routerHealth: RouterHealth | null
  /** `state.routerUpdatedAt[id]`, epoch ms — feeds the staleness rule. */
  lastReceivedAt: number | undefined
  tailscale: TailscaleStatus | null
  /** `useRenewvanBus().status` — the kiosk's MQTT bus link, merged into
   * this popover as a dot row (supersedes the deleted `RouterStatusIcon`). */
  busStatus: ConnectionStatus
  onOpenSettings: () => void
}

interface TierPresentation {
  /** Filled bar count — bar tiers only. */
  filled?: number
  /** Reserved glyph — checking/offline tiers only. */
  Icon?: LucideIcon
  iconClass: string
  label: string
}

/**
 * Header button for the van's uplink (`CONTEXT.md`) — the cellular
 * connection through the router entity (`renewvan/router/<id>/*`). One
 * morphing icon across five tiers (0–4 bars) whose tier comes from
 * `connectionTier` (lib/connection.ts owns the bands and the
 * offline/staleness rules). Bar glyphs are the custom four-bar tower
 * (`BarTower`) so tiers read at kiosk distance without pulling an icon
 * package for a shape lucide doesn't have.
 *
 * Its popover is the single connection surface of the header: uplink
 * fields, the kiosk's MQTT bus-link state (dot row, merged in from the
 * deleted `RouterStatusIcon`), Tailscale, and a CTA that deep-links into
 * Settings → Network where every router field lives.
 */
const TIER_PRESENTATION: Record<ConnectionTier, TierPresentation> = {
  checking: {
    Icon: Loader2,
    iconClass: 'text-warning animate-spin',
    label: 'Checking connection…',
  },
  offline: { Icon: CloudOff, iconClass: 'text-danger', label: 'Connection offline' },
  'no-service': { filled: 0, iconClass: 'text-danger', label: 'Connection: no service' },
  'bars-1': { filled: 1, iconClass: 'text-warning', label: 'Connection: 1 of 4 bars' },
  'bars-2': { filled: 2, iconClass: 'text-warning', label: 'Connection: 2 of 4 bars' },
  'bars-3': { filled: 3, iconClass: 'text-success', label: 'Connection: 3 of 4 bars' },
  'bars-4': { filled: 4, iconClass: 'text-success', label: 'Connection: 4 of 4 bars' },
}

/** Dot + text status row shared by the hub-link and Tailscale lines —
 * the "get rid of the icon, just leave a dot" treatment. */
function StatusDotRow({ label, tone, text }: { label: string; tone: string; text: string }) {
  return (
    <div className="text-muted flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-foreground flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${tone}`} aria-hidden />
        {text}
      </span>
    </div>
  )
}

/** Bus-link dot colour in HeroUI tokens. `lib/connection.ts`'s `BUS_TONE`
 * still carries the coss `bg-destructive` for the disconnected state,
 * which HeroUI doesn't define (`bg-danger` here instead). */
const BUS_DOT_TONE: Record<ConnectionStatus, string> = {
  connected: 'bg-success',
  connecting: 'bg-warning',
  disconnected: 'bg-danger',
}

export function UplinkStatusButton({
  router,
  routerHealth,
  lastReceivedAt,
  tailscale,
  busStatus,
  onOpenSettings,
}: UplinkStatusButtonProps) {
  const now = useNow(30_000)
  const tier = connectionTier(router?.signal_rsrp_dbm, routerHealth, lastReceivedAt, now)
  const { filled, Icon, iconClass, label } = TIER_PRESENTATION[tier]

  return (
    <IconStatusButton
      label={label}
      data-testid="uplink-status-button"
      data-state={tier}
      icon={
        Icon !== undefined ? (
          <Icon className={`size-5 ${iconClass}`} />
        ) : (
          <BarTower filled={filled ?? 0} className={iconClass} />
        )
      }
      title={uplinkHeadline(router, tier)}
      onOpenSettings={onOpenSettings}
      settingsLabel="Network settings"
    >
      {tier !== 'checking' && tier !== 'offline' && (
        <>
          <FieldRow
            label="RSRP"
            value={router?.signal_rsrp_dbm !== undefined ? `${router.signal_rsrp_dbm} dBm` : null}
          />
          <FieldRow
            label="Data"
            value={
              router?.data_used_month_rx_b !== undefined &&
              router?.data_used_month_tx_b !== undefined
                ? `↓ ${formatBytes(router.data_used_month_rx_b)} · ↑ ${formatBytes(router.data_used_month_tx_b)}`
                : null
            }
          />
        </>
      )}
      <div className="border-border mt-4 flex flex-col gap-2 border-t pt-4">
        <StatusDotRow label="Hub" tone={BUS_DOT_TONE[busStatus]} text={busStatusText(busStatus)} />
        <StatusDotRow
          label="Tailscale"
          tone={tailscale?.connected ? 'bg-success' : 'bg-muted'}
          text={tailscaleStatusText(tailscale)}
        />
      </div>
    </IconStatusButton>
  )
}

/** Four ascending bars, filled count per tier, remainder dimmed — the
 * five-tier scale readable at kiosk distance. */
function BarTower({ filled, className }: { filled: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={`size-5 ${className ?? ''}`} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <rect
          key={i}
          x={2 + i * 5.5}
          y={17 - i * 4.5}
          width="4"
          height={4.5 + i * 4.5}
          rx="1"
          className={i < filled ? 'fill-current' : 'fill-current opacity-25'}
        />
      ))}
    </svg>
  )
}

function FieldRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="text-muted flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="text-foreground">{value ?? '—'}</span>
    </div>
  )
}
