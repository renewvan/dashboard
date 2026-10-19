import { version } from '../../../../../package.json'
import { DetailList, DetailRow } from '../../shared/DetailList'
import { useSettings } from '../../SettingsContext'

/**
 * The firmware on the van: the dashboard's own build first, then one row per Node, worded exactly
 * as on the Nodes page (`v0.8.0`, `dev`, `Unknown`, `offline, last seen v0.1.0`). Read-only.
 */
export function FirmwareView() {
  const { nodes } = useSettings()

  return (
    <DetailList label="Firmware">
      <DetailRow label="Dashboard" value={version} />
      {nodes.map((row) => (
        <DetailRow key={row.key} label={row.label} value={row.version} />
      ))}
    </DetailList>
  )
}
