import { entityCountText, type DriverRow } from '@/lib/drivers'
import { GroupRow } from '../shared/GroupRow'
import { useSettingsData } from '../SettingsContext'
import { DRIVER_TONE } from './driverTone'

/**
 * `<version> · <N entities>`: the one-line state of a Driver. A Driver with no info has no known
 * entity count (its `publishes` is unknown), so it reads as its version alone. The Board serial is
 * never shown here.
 */
function describe(row: DriverRow): string {
  return row.entityCount === null
    ? row.version
    : `${row.version} · ${entityCountText(row.entityCount)}`
}

/**
 * Every Driver on the van, one row each (never one per entity type), with a status dot, its version
 * and how many entities it publishes. A row opens the Driver's Driver page. Entities that no Driver
 * claims appear as a fallback row by entity type, so a partial rollout never leaves it blank.
 */
export function DriversView({ onOpen }: { onOpen: (key: string) => void }) {
  const { drivers } = useSettingsData()

  if (drivers.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No drivers connected. Waiting for the renewvan hub.
      </p>
    )
  }

  return (
    <ul aria-label="Published drivers" className="flex flex-col gap-2">
      {drivers.map((row) => (
        <li key={row.key} className={row.dim ? 'opacity-60' : ''}>
          <GroupRow
            label={row.name}
            description={describe(row)}
            statusTone={DRIVER_TONE[row.tone]}
            onOpen={() => onOpen(row.key)}
          />
        </li>
      ))}
    </ul>
  )
}
