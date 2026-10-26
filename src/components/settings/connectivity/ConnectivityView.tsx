import { cellularTier, busStatusText, uplinkHeadline } from '@/lib/connection'
import { routerDriver, routerName } from '@/lib/routerDriver'
import { tailscaleStatusText } from '@/lib/tailscale'
import { useNow } from '@/hooks/useNow'
import { GroupRow } from '../shared/GroupRow'
import { useSettingsData } from '../SettingsContext'
import type { SettingsSubView } from '../views'

interface ConnectivityViewProps {
  onOpen: (view: SettingsSubView) => void
}

/**
 * Connectivity's rows, each with a live one-line summary. The tick lives here
 * so a stale router feed degrades the router headline to Offline with no bus
 * traffic to re-render it.
 *
 * The first row is the router, named for the Driver that feeds it (`RUT-360`). With no router
 * Driver on the bus and no router data either, nothing is installed to check, so it says so rather
 * than "Checking…" for ever. Router data with no Driver behind it (a driver that publishes no info
 * yet) is still shown: live numbers are never hidden for want of a name.
 */
export function ConnectivityView({ onOpen }: ConnectivityViewProps) {
  const { drivers, router, routerHealth, routerUpdatedAt, busStatus, tailscale } = useSettingsData()
  const now = useNow(30_000)
  const driver = routerDriver(drivers)
  const tier = cellularTier(router?.signal_rsrp_dbm, routerHealth, routerUpdatedAt, now)
  const installed = driver !== undefined || routerUpdatedAt !== undefined

  return (
    <div className="flex flex-col gap-2">
      <GroupRow
        label={routerName(driver)}
        description={installed ? uplinkHeadline(router, tier) : 'Not installed'}
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
