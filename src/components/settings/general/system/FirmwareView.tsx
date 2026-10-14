import { version } from '../../../../../package.json'
import { DetailList, DetailRow } from '../../shared/DetailList'

/**
 * The firmware the kiosk is running. Only the dashboard's own build version is known today: no
 * bus topic reports the hub's or a node's firmware, so nothing else is listed (a row is added
 * here when its data exists, not before).
 */
export function FirmwareView() {
  return (
    <DetailList label="Firmware">
      <DetailRow label="Dashboard" value={version} />
    </DetailList>
  )
}
