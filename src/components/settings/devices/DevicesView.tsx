import { entityCountText, type DeviceRow } from '@/lib/devices'
import { GroupRow } from '../shared/GroupRow'
import { useSettings } from '../SettingsContext'
import { DEVICE_TONE } from './deviceTone'

/**
 * `<version> · <N entities>`: the one-line state of a Device. A Device with no info has no known
 * entity count (its `publishes` is unknown), so it reads as its version alone. The Board serial is
 * never shown here.
 */
function describe(row: DeviceRow): string {
  return row.entityCount === null
    ? row.version
    : `${row.version} · ${entityCountText(row.entityCount)}`
}

/**
 * Every Device on the van, one row each (never one per entity type), with a status dot, its version
 * and how many entities it publishes. A row opens the Device's Device page. Entities that no Device
 * claims appear as a fallback row by entity type, so a partial rollout never leaves it blank.
 */
export function DevicesView({ onOpen }: { onOpen: (key: string) => void }) {
  const { devices } = useSettings()

  if (devices.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No devices connected. Waiting for the renewvan hub.
      </p>
    )
  }

  return (
    <ul aria-label="Published devices" className="flex flex-col gap-2">
      {devices.map((row) => (
        <li key={row.key} className={row.dim ? 'opacity-60' : ''}>
          <GroupRow
            label={row.name}
            description={describe(row)}
            statusTone={DEVICE_TONE[row.tone]}
            onOpen={() => onOpen(row.key)}
          />
        </li>
      ))}
    </ul>
  )
}
