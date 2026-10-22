import { version } from '../../../../../package.json'
import { DetailList, DetailRow } from '../../shared/DetailList'
import { useSettings } from '../../SettingsContext'

/**
 * The firmware on the van: the hub (the Pi's compose stack and schema) first, then the dashboard's
 * own build, then one row per Device, worded exactly as on the Devices page (`v0.8.0`, `dev`,
 * `Unknown`, `offline, last seen v0.1.0`). The hub reads `Unknown` until it has published a
 * version: before the first message, or from a Pi not yet redeployed. Read-only.
 */
export function FirmwareView() {
  const { devices, hubStatus } = useSettings()

  return (
    <DetailList label="Firmware">
      <DetailRow label="Hub" value={hubStatus?.version ?? 'Unknown'} />
      <DetailRow label="Dashboard" value={version} />
      {devices.map((row) => (
        <DetailRow key={row.key} label={row.name} value={row.version} />
      ))}
    </DetailList>
  )
}
