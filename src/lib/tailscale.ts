import type { TailscaleStatus } from '@/hooks/useRenewvanBus'

/**
 * Human-readable Tailscale status copy, shared between the header uplink
 * button's popover and the Settings page's row (not yet ported) — one copy
 * source, not two independently-drifting strings.
 */
export function tailscaleStatusText(tailscale: TailscaleStatus | null): string {
  if (tailscale === null) return 'Loading…'
  if (tailscale.connected) return tailscale.ip ?? 'Connected'
  if (tailscale.enabled) return 'Not authenticated'
  return 'Not installed'
}
