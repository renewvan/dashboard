import { tailscaleStatusText } from '@/lib/tailscale'
import { DetailList, StatusRow } from './DetailList'
import { useSettings } from './SettingsContext'

/** Loading, not authenticated, not installed, or the address when connected. */
export function TailscaleView() {
  const { tailscale } = useSettings()

  return (
    <DetailList label="Tailscale">
      <StatusRow
        label="Status"
        tone={tailscale?.connected ? 'bg-success' : 'bg-muted'}
        text={tailscaleStatusText(tailscale)}
      />
    </DetailList>
  )
}
