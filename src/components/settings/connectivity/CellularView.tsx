import { networkTypeLabel } from '@/lib/connection'
import { formatBytes, formatUptime } from '@/lib/format'
import { plmnOperatorName } from '@/lib/plmn'
import { routerDriver, routerName } from '@/lib/routerDriver'
import { DetailList, DetailRow, StatusRow } from '../shared/DetailList'
import { useSettingsData } from '../SettingsContext'
import { DRIVER_TONE } from '../drivers/driverTone'

/**
 * The router's page: first the Driver that feeds it (its product, status and firmware, shown only
 * while a router driver has reported), then every field the router reports. The router fills in one
 * property at a time, so each row degrades to a dash on its own.
 */
export function CellularView() {
  const { router, drivers } = useSettingsData()
  const driver = routerDriver(drivers)

  return (
    <div className="flex flex-col gap-4">
      {driver && (
        <DetailList label="Router driver" heading="Driver">
          <DetailRow label="Product" value={driver.info?.product ?? null} />
          <StatusRow label="Status" tone={DRIVER_TONE[driver.tone]} text={driver.status} />
          <DetailRow label="Firmware" value={driver.version} />
        </DetailList>
      )}
      <DetailList label={routerName(driver)} heading="Signal">
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
