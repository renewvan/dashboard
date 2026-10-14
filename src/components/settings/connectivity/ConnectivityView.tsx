import { connectionTier, busStatusText, uplinkHeadline } from '@/lib/connection'
import { tailscaleStatusText } from '@/lib/tailscale'
import { useNow } from '@/hooks/useNow'
import { GroupRow } from '../shared/GroupRow'
import { useSettings } from '../SettingsContext'
import type { SettingsSubView } from '../views'

interface ConnectivityViewProps {
  onOpen: (view: SettingsSubView) => void
}

/**
 * Connectivity's rows, each with a live one-line summary. The tick lives here
 * so a stale router feed degrades the Cellular headline to Offline with no bus
 * traffic to re-render it.
 */
export function ConnectivityView({ onOpen }: ConnectivityViewProps) {
  const { router, routerHealth, routerUpdatedAt, busStatus, tailscale } = useSettings()
  const now = useNow(30_000)
  const tier = connectionTier(router?.signal_rsrp_dbm, routerHealth, routerUpdatedAt, now)

  return (
    <div className="flex flex-col gap-2">
      <GroupRow
        label="Cellular"
        description={uplinkHeadline(router, tier)}
        onOpen={() => onOpen('cellular')}
      />
      <GroupRow label="Hub" description={busStatusText(busStatus)} onOpen={() => onOpen('hub')} />
      <GroupRow
        label="Tailscale"
        description={tailscaleStatusText(tailscale)}
        onOpen={() => onOpen('tailscale')}
      />
    </div>
  )
}
