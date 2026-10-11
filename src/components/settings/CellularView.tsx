import { formatBytes, formatUptime } from '@/lib/format'
import { plmnOperatorName } from '@/lib/plmn'
import { DetailList, DetailRow } from './DetailList'
import { useSettings } from './SettingsContext'

/** Every field the router reports. The router fills in one property at a time,
 * so each row degrades to a dash on its own. */
export function CellularView() {
  const { router } = useSettings()

  return (
    <DetailList label="Cellular">
      <DetailRow
        label="Operator"
        value={
          router?.operator !== undefined
            ? (plmnOperatorName(router.operator) ?? router.operator)
            : null
        }
      />
      <DetailRow label="Network" value={router?.network_type?.toUpperCase() ?? null} />
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
  )
}
