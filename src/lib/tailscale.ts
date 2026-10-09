import type { TailscaleStatus } from '@/hooks/useRenewvanBus'

/**
 * Human-readable Tailscale status copy, shared between SettingsTab's
 * row and the header uplink button's popover — one copy source, not
 * two independently-drifting strings.
 */
export function tailscaleStatusText(tailscale: TailscaleStatus | null): string {
  if (tailscale === null) return 'Loading…'
  if (tailscale.connected) return tailscale.ip ?? 'Connected'
  if (tailscale.enabled) return 'Not authenticated'
  return 'Not installed'
}
