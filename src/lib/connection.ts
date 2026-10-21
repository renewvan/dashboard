import type { ConnectionStatus, RouterHealth, TailscaleStatus } from '@/hooks/useRenewvanBus'
import type { Router } from '@/types'
import { plmnOperatorName } from './plmn'

/**
 * The cellular uplink's state model, derived from the router entity
 * (`renewvan/router/<id>/*`) + the router Device's health
 * (`state.devices.router`). Pure decision function (tailscaleStatusText
 * precedent): the component renders, this decides.
 *
 * Resolution order (settled in .scratch/router-connection-icon/ grilling,
 * 2026-10-03):
 * 1. device health offline → offline (LWT trumps everything);
 * 2. no router data received yet → checking;
 * 3. newest property older than STALE_MS (3× the 60 s publish cadence;
 *    receipt-time — a retained message's true publish time isn't on the
 *    wire, and the health LWT is the cross-check for a dead device) →
 *    offline;
 * 4. no signal_rsrp_dbm among the received properties yet → checking;
 * 5. LTE-calibrated bands from rsrp — 4 bars ≥ -85, 3 bars ≥ -95,
 *    2 bars ≥ -105, 1 bar ≥ -115, below that no-service. no-service is
 *    radio-silent while the device is alive — NOT offline (grilling: signal
 *    floor doesn't fake offline). NR recalibration is fog until router
 *    hardware changes (RUT-360 is LTE-only).
 *
 * `checking` here means "no router data yet" — the Settings → Connectivity
 * Cellular row reads this directly. The header icon must not: see
 * {@link connectionTier}.
 */
export type CellularTier =
  | 'checking'
  | 'offline'
  | 'no-service'
  | 'bars-1'
  | 'bars-2'
  | 'bars-3'
  | 'bars-4'

const STALE_MS = 180_000

export function cellularTier(
  rsrp: number | undefined,
  health: RouterHealth | null,
  lastReceivedAt: number | undefined,
  now: number,
): CellularTier {
  if (health === 'offline') return 'offline'
  if (lastReceivedAt === undefined) return 'checking'
  if (now - lastReceivedAt > STALE_MS) return 'offline'
  if (rsrp === undefined) return 'checking'
  if (rsrp >= -85) return 'bars-4'
  if (rsrp >= -95) return 'bars-3'
  if (rsrp >= -105) return 'bars-2'
  if (rsrp >= -115) return 'bars-1'
  return 'no-service'
}

/**
 * The header icon's state model: the cellular tier while the router is
 * actually reporting (bars / no-service), otherwise the kiosk's own links
 * decide, because the van can be online over wifi / LAN / Tailscale with no
 * router feed at all (RUT-360 off, not bridged, or not the active path):
 * - router feeding (cellular tier is bars / no-service, or `checking` because
 *   data arrived before its signal field) → that tier;
 * - router silent (no data, stale, or health offline): bus link connected or
 *   Tailscale connected → `connected`; bus link still connecting → `checking`;
 *   else `offline`.
 *
 * `checking` is therefore transient (bus coming up / signal field arriving),
 * never a permanent "no router data" state.
 */
export type ConnectionTier = CellularTier | 'connected'

export interface ConnectionInputs {
  rsrp: number | undefined
  routerHealth: RouterHealth | null
  /** Receipt time (epoch ms) of the newest router property, if any. */
  lastReceivedAt: number | undefined
  now: number
  busStatus: ConnectionStatus
  tailscale: TailscaleStatus | null
}

export function connectionTier({
  rsrp,
  routerHealth,
  lastReceivedAt,
  now,
  busStatus,
  tailscale,
}: ConnectionInputs): ConnectionTier {
  const cellular = cellularTier(rsrp, routerHealth, lastReceivedAt, now)
  const routerSilent =
    routerHealth === 'offline' || lastReceivedAt === undefined || now - lastReceivedAt > STALE_MS
  if (!routerSilent) return cellular
  if (busStatus === 'connected' || tailscale?.connected) return 'connected'
  if (busStatus === 'connecting') return 'checking'
  return 'offline'
}

/**
 * One-line summary of the uplink tier (`LTE · <operator>` / `Checking…` /
 * `Connected` / `Offline` / `No service`) — the uplink popover's title and
 * the Settings → Connectivity Cellular row's summary, read from this one copy
 * source, not two independently-drifting strings (tailscaleStatusText
 * precedent). Degrades on a partial Router exactly like the old popover row
 * did (`UNKNOWN · —`) — no isCompleteRouter guard, per types.ts.
 */
export function uplinkHeadline(router: Partial<Router> | undefined, tier: ConnectionTier): string {
  if (tier === 'checking') return 'Checking…'
  if (tier === 'connected') return 'Connected'
  if (tier === 'offline') return 'Offline'
  if (tier === 'no-service') return 'No service'
  return `${(router?.network_type ?? 'unknown').toUpperCase()} · ${
    plmnOperatorName(router?.operator) ?? router?.operator ?? '—'
  }`
}

/**
 * Human-readable copy for the kiosk's MQTT bus link
 * (`ConnectionStatus` from `useRenewvanBus`) — shared by the uplink
 * popover's hub-link row and the Settings → Connectivity Hub row and page.
 * Supersedes the removed `RouterStatusIcon`'s private COPY map.
 */
export function busStatusText(status: ConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected'
    case 'connecting':
      return 'Connecting…'
    case 'disconnected':
      return 'Down — showing last-known state'
  }
}

/** Status-dot colour for the same bus-link surfaces that share
 * `busStatusText` (above) — one copy source, not two maps drifting. */
export const BUS_TONE: Record<ConnectionStatus, string> = {
  connected: 'bg-success',
  connecting: 'bg-warning',
  disconnected: 'bg-danger',
}
