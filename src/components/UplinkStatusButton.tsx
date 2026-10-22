import { CloudOff, Loader2, Wifi } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useNow } from '@/hooks/useNow'
import type { ConnectionStatus, RouterHealth, TailscaleStatus } from '@/hooks/useRenewvanBus'
import {
  BUS_TONE,
  busStatusText,
  connectionBadge,
  connectionTier,
  networkTypeLabel,
  uplinkHeadline,
  type ConnectionTier,
} from '@/lib/connection'
import { formatBytes } from '@/lib/format'
import type { HubAddress } from '@/lib/hubAddress'
import { tailscaleStatusText } from '@/lib/tailscale'
import type { Router } from '@/types'
import { IconStatusButton } from './IconStatusButton'

export interface UplinkStatusButtonProps {
  /** `state.routers[id]` — partial between retained messages, deliberately (see types.ts). */
  router: Partial<Router> | undefined
  routerHealth: RouterHealth | null
  /** `state.routerUpdatedAt[id]`, epoch ms — feeds the staleness rule. */
  lastReceivedAt: number | undefined
  tailscale: TailscaleStatus | null
  /** `useRenewvanBus().status` — the kiosk's MQTT bus link, shown in
   * this popover as a dot row. */
  busStatus: ConnectionStatus
  /** The hub (`hubAddress`): the Pi's own address from `renewvan/hub/status` and how this kiosk
   * reaches the broker. Null while neither is known. */
  hub: HubAddress | null
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

/** Icon, colour and accessible label per connection tier (bar tiers set `filled`; checking/connected/offline set `Icon`). */
const TIER_PRESENTATION: Record<ConnectionTier, TierPresentation> = {
  checking: {
    Icon: Loader2,
    iconClass: 'text-warning animate-spin',
    label: 'Checking connection…',
  },
  // Reachable over a non-cellular path (wifi / LAN / Tailscale); no cellular figures to show.
  connected: { Icon: Wifi, iconClass: 'text-success', label: 'Connected' },
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
 * fields, the kiosk's MQTT bus-link state (dot row), Tailscale, and a CTA
 * that opens Settings → Connectivity → Cellular directly, where every
 * router field lives.
 */
export function UplinkStatusButton({
  router,
  routerHealth,
  lastReceivedAt,
  tailscale,
  busStatus,
  hub,
  onOpenSettings,
}: UplinkStatusButtonProps) {
  const now = useNow(30_000)
  const tier = connectionTier({
    rsrp: router?.signal_rsrp_dbm,
    routerHealth,
    lastReceivedAt,
    now,
    busStatus,
    tailscale,
  })
  const { filled, Icon, iconClass, label } = TIER_PRESENTATION[tier]
  const badge = connectionBadge(tier, router?.network_type, hub)

  return (
    <IconStatusButton
      label={label}
      data-testid="uplink-status-button"
      data-state={tier}
      icon={
        <span className="relative inline-flex">
          {Icon !== undefined ? (
            <Icon className={`size-5 ${iconClass}`} />
          ) : (
            <BarTower filled={filled ?? 0} className={iconClass} />
          )}
          {badge && (
            <span
              aria-hidden="true"
              data-testid="uplink-badge"
              className="bg-surface text-foreground border-border absolute -right-2 -bottom-1.5 rounded px-0.5 text-[9px] leading-3 font-bold tracking-tight"
            >
              {badge}
            </span>
          )}
        </span>
      }
      title={uplinkHeadline(router, tier)}
      onOpenSettings={onOpenSettings}
      settingsLabel="Network settings"
    >
      {tier !== 'checking' && tier !== 'connected' && tier !== 'offline' && (
        <Section heading="Router connection">
          <FieldRow
            label="Network"
            value={
              router?.network_type !== undefined ? networkTypeLabel(router.network_type) : null
            }
          />
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
        </Section>
      )}
      <Section heading="Hub connection">
        <StatusDotRow label="Hub" tone={BUS_TONE[busStatus]} text={busStatusText(busStatus)} />
        <FieldRow label="Address" value={hub?.host ?? null} />
      </Section>
      <Section heading="Remote access">
        <StatusDotRow
          label="Tailscale"
          tone={tailscale?.connected ? 'bg-success' : 'bg-muted'}
          text={tailscaleStatusText(tailscale)}
        />
      </Section>
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

/**
 * A titled group of rows in the popover. The router, the hub and Tailscale are three different
 * things the van is reached through, so each reads as its own block (the heading names the source
 * and labels the group for screen readers) rather than as one undifferentiated list.
 */
function Section({ heading, children }: { heading: string; children: ReactNode }) {
  const id = useId()
  return (
    <div
      role="group"
      aria-labelledby={id}
      className="border-border mt-2 flex flex-col gap-2 border-t pt-3 first:mt-0 first:border-t-0 first:pt-0"
    >
      <div id={id} className="text-muted text-xs font-medium tracking-wide uppercase">
        {heading}
      </div>
      {children}
    </div>
  )
}
