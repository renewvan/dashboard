import { BUS_TONE, busStatusText } from '@/lib/connection'
import { deviceCounts, deviceCountsText } from '@/lib/hubDevices'
import { hubRouteText } from '@/lib/hubAddress'
import { DetailList, DetailRow, StatusRow } from '../shared/DetailList'
import { useSettings } from '../SettingsContext'

/**
 * The hub as this kiosk sees it, in four blocks: the live link to the broker (the Bus link and how
 * it is made), the Pi that runs it (its own address and name, published by the hub plugin), the
 * Devices on the bus, and where this dashboard was served from. A value that has not arrived reads
 * as a dash, never a guess. Nothing here can show a credential: the broker's login is only ever a
 * yes or no (see `brokerLink`).
 */
export function HubView() {
  const { busStatus, hub, hubStatus, broker, devices } = useSettings()
  const counts = deviceCounts(devices)

  return (
    <div className="flex flex-col gap-4">
      <DetailList label="Bus link" heading>
        <StatusRow label="Status" tone={BUS_TONE[busStatus]} text={busStatusText(busStatus)} />
        <DetailRow label="Broker" value={broker?.endpoint ?? null} />
        <DetailRow label="Protocol" value={broker?.protocol ?? null} />
        <DetailRow
          label="Login"
          value={broker === null ? null : broker.authenticated ? 'Required' : 'None'}
        />
        <DetailRow label="Reached over" value={hub ? hubRouteText(hub.route) : null} />
      </DetailList>
      <DetailList label="Hub" heading>
        <DetailRow label="Address" value={hub?.host ?? null} />
        <DetailRow label="Hostname" value={hubStatus?.hostname ?? null} />
      </DetailList>
      <DetailList label="Devices" heading>
        <DetailRow label="On the bus" value={deviceCountsText(counts)} />
        <DetailRow label="Total" value={String(counts.total)} />
      </DetailList>
      <DetailList label="Dashboard" heading>
        <DetailRow label="Served from" value={window.location.host || null} />
      </DetailList>
    </div>
  )
}
