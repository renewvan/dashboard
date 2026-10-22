import { networkTypeLabel } from '@/lib/connection'
import { formatBytes, formatUptime } from '@/lib/format'
import { plmnOperatorName } from '@/lib/plmn'
import { routerDevice, routerName } from '@/lib/routerDevice'
import { DetailList, DetailRow, StatusRow } from '../shared/DetailList'
import { useSettings } from '../SettingsContext'
import { DEVICE_TONE } from '../devices/deviceTone'

/**
 * The router's page: first the Device that feeds it (its product, status and firmware, shown only
 * while a router driver has reported), then every field the router reports. The router fills in one
 * property at a time, so each row degrades to a dash on its own.
 */
export function CellularView() {
  const { router, devices } = useSettings()
  const device = routerDevice(devices)

  return (
    <div className="flex flex-col gap-4">
      {device && (
        <DetailList label="Router device" heading="Device">
          <DetailRow label="Product" value={device.info?.product ?? null} />
          <StatusRow label="Status" tone={DEVICE_TONE[device.tone]} text={device.status} />
          <DetailRow label="Firmware" value={device.version} />
        </DetailList>
      )}
      <DetailList label={routerName(device)} heading="Signal">
        <DetailRow
          label="Operator"
          value={
            router?.operator !== undefined
              ? (plmnOperatorName(router.operator) ?? router.operator)
              : null
          }
        />
        <DetailRow
          label="Network"
          value={router?.network_type !== undefined ? networkTypeLabel(router.network_type) : null}
        />
        <DetailRow
          label="RSRP"
          value={router?.signal_rsrp_dbm !== undefined ? `${router.signal_rsrp_dbm} dBm` : null}
        />
        <DetailRow
          label="RSRQ"
          value={router?.signal_rsrq_db !== undefined ? `${router.signal_rsrq_db} dB` : null}
        />
        <DetailRow
          label="SINR"
          value={router?.signal_sinr_db !== undefined ? `${router.signal_sinr_db} dB` : null}
        />
        <DetailRow
          label="RSSI"
          value={router?.signal_rssi_dbm !== undefined ? `${router.signal_rssi_dbm} dBm` : null}
        />
        <DetailRow
          label="Uptime"
          value={router?.uptime_s !== undefined ? formatUptime(router.uptime_s) : null}
        />
        <DetailRow
          label="Data this month"
          value={
            router?.data_used_month_rx_b !== undefined && router?.data_used_month_tx_b !== undefined
              ? `↓ ${formatBytes(router.data_used_month_rx_b)} · ↑ ${formatBytes(router.data_used_month_tx_b)}`
              : null
          }
        />
      </DetailList>
    </div>
  )
}
