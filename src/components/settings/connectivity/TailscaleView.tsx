import {
  tailscaleDaemonText,
  tailscaleEndpoints,
  tailscalePeersText,
  tailscaleStatusText,
} from '@/lib/tailscale'
import { DetailList, DetailRow, StatusRow } from '../shared/DetailList'
import { useSettingsData } from '../SettingsContext'

/**
 * The van's Tailscale node, from the retained status the Tailscale plugin publishes: whether it is
 * up (the Status row keeps its old wording), then the node itself, then where the van's services
 * answer over the tailnet. Every row is always there; one the plugin has no value for (it publishes
 * nothing but `false`, `null` and `0` while signed out) reads as a dash rather than a made-up one.
 */
export function TailscaleView() {
  const { tailscale } = useSettingsData()
  const endpoints = tailscaleEndpoints(tailscale)

  return (
    <div className="flex flex-col gap-4">
      <DetailList label="Tailscale">
        <StatusRow
          label="Status"
          tone={tailscale?.connected ? 'bg-success' : 'bg-muted'}
          text={tailscaleStatusText(tailscale)}
        />
      </DetailList>
      <DetailList label="Node" heading>
        <DetailRow label="Daemon" value={tailscaleDaemonText(tailscale)} />
        <DetailRow label="Address" value={tailscale?.ip ?? null} />
        <DetailRow label="Hostname" value={tailscale?.hostname ?? null} />
        <DetailRow
          label="Peers"
          value={tailscale?.connected ? tailscalePeersText(tailscale.peers) : null}
        />
      </DetailList>
      <DetailList label="Reachable at" heading>
        {endpoints.length > 0 ? (
          endpoints.map(({ label, value }) => <DetailRow key={label} label={label} value={value} />)
        ) : (
          <DetailRow label="Dashboard" value={null} />
        )}
      </DetailList>
    </div>
  )
}
