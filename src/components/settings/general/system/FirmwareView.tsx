import { version } from '../../../../../package.json'
import { DetailList, DetailRow } from '../../shared/DetailList'
import { useSettings } from '../../SettingsContext'

/**
 * The firmware on the van: the dashboard's own build first, then one row per Device, worded exactly
 * as on the Devices page (`v0.8.0`, `dev`, `Unknown`, `offline, last seen v0.1.0`). Read-only.
 */
export function FirmwareView() {
  const { devices } = useSettings()

  return (
    <DetailList label="Firmware">
      <DetailRow label="Dashboard" value={version} />
      {devices.map((row) => (
        <DetailRow key={row.key} label={row.name} value={row.version} />
      ))}
    </DetailList>
  )
}
