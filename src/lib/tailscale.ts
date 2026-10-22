import type { TailscaleStatus } from '@/hooks/useRenewvanBus'

/**
 * Human-readable Tailscale status copy, shared between the header uplink
 * button's popover and the Settings → Connectivity Tailscale row and page —
 * one copy source, not independently-drifting strings.
 */
export function tailscaleStatusText(tailscale: TailscaleStatus | null): string {
  if (tailscale === null) return 'Loading…'
  if (tailscale.connected) return tailscale.ip ?? 'Connected'
  if (tailscale.enabled) return 'Not authenticated'
  return 'Not installed'
}

/**
 * What the Tailscale daemon is doing, in the plugin's own terms (`tailscaled` running, signed in):
 * `Not installed` (daemon absent), `Needs login` (running, not authenticated: `sudo tailscale up`
 * is still to do), `Connected`. Null while no status has arrived, so a page can show a dash rather
 * than guess.
 */
export function tailscaleDaemonText(tailscale: TailscaleStatus | null): string | null {
  if (tailscale === null) return null
  if (tailscale.connected) return 'Connected'
  if (tailscale.enabled) return 'Needs login'
  return 'Not installed'
}

/** `1 peer online` / `N peers online`; `No peers online` for none. */
export function tailscalePeersText(peers: number): string {
  if (peers === 0) return 'No peers online'
  return peers === 1 ? '1 peer online' : `${peers} peers online`
}

/**
 * Where the van's services answer over the tailnet, from the Tailscale address the plugin
 * publishes (its README's remote-access table): the dashboard on port 80 and the MQTT broker on
 * 1883. Empty while there is no address, so a page shows nothing rather than a dead link.
 */
export function tailscaleEndpoints(
  tailscale: TailscaleStatus | null,
): Array<{ label: string; value: string }> {
  const ip = tailscale?.connected ? tailscale.ip : null
  if (!ip) return []
  return [
    { label: 'Dashboard', value: `http://${ip}` },
    { label: 'MQTT', value: `${ip}:1883` },
  ]
}
