import { connectionTier, busStatusText, uplinkHeadline } from '@/lib/connection'
import { tailscaleStatusText } from '@/lib/tailscale'
import { useNow } from '@/hooks/useNow'
import { GroupRow } from './GroupRow'
import { useSettings } from './SettingsContext'

interface ConnectivityViewProps {
  onOpen: (view: 'cellular' | 'hub' | 'tailscale') => void
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
    <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
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
