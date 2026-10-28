import { ChevronDown } from 'lucide-react'
import { useDevicesCollapsed } from '@/hooks/useDevicesCollapsed'
import { useDevicesSort, type DevicesSort as Mode } from '@/hooks/useDevicesSort'
import { entityCountText, type DriverRow } from '@/lib/drivers'
import { instanceKey, instanceLabel, parseInstanceKey, type InstanceType } from '@/lib/instances'
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

const byName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' })

/** The "By driver | By entity" toggle; each segment is a full 44px-tall touch target. */
function SortToggle({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div
      role="radiogroup"
      aria-label="Sort devices by"
      className="border-border bg-surface flex gap-2 rounded-2xl border p-1.5"
    >
      {(['driver', 'entity'] as const).map((m) => (
        <button
          key={m}
          type="button"
          role="radio"
          aria-checked={mode === m}
          onClick={() => onChange(m)}
          className={`min-h-11 flex-1 rounded-xl text-sm font-medium ${mode === m ? 'bg-accent text-accent-foreground' : 'text-muted'}`}
        >
          {m === 'driver' ? 'By driver' : 'By entity'}
        </button>
      ))}
    </div>
  )
}

/**
 * Every Driver on the van, one row each (never one per entity type), with a status dot, its version
 * and how many entities it publishes. A row opens the Driver's Driver page. Entities that no Driver
 * claims appear as a fallback row by entity type, so a partial rollout never leaves it blank.
 */
export function DriversView({
  onOpen,
  onOpenInstance,
  onOpenTank,
}: {
  onOpen: (key: string) => void
  /** Opens one instance's own page, by its `instanceKey`. */
  onOpenInstance: (key: string) => void
  /** Opens one tank's own page, by tank id. */
  onOpenTank: (id: string) => void
}) {
  const { drivers, batteries, solar, chargers } = useSettingsData()
  const [mode, setMode] = useDevicesSort()
  const { isCollapsed, toggle } = useDevicesCollapsed()

  if (drivers.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No drivers connected. Waiting for the renewvan hub.
      </p>
    )
  }

  const records: Record<string, Record<string, { name?: string; driver?: string }>> = {
    battery: batteries,
    solar,
    charger: chargers,
  }
  // A device opens its own page; the types with no page of their own (router, tilt) open their Driver.
  const openDevice = (driver: DriverRow, type: string, id: string) => {
    if (type === 'tank') return onOpenTank(id)
    const key = instanceKey(type as InstanceType, id)
    if (parseInstanceKey(key) !== undefined) return onOpenInstance(key)
    onOpen(driver.key)
  }
  // By entity: a section per entity type, each instance under it with its Driver; all by name.
  const sections = new Map<
    string,
    {
      label: string
      items: { key: string; label: string; driver: DriverRow; open: () => void }[]
    }
  >()
  for (const driver of drivers)
    for (const { type, label, ids } of driver.entities) {
      const section = sections.get(type) ?? { label, items: [] }
      for (const id of ids)
        section.items.push({
          key: `${driver.key}:${id}`,
          label: instanceLabel(id, records[type]?.[id] ?? {}, drivers),
          driver,
          open: () => openDevice(driver, type, id),
        })
      sections.set(type, section)
    }
  const entitySections = [...sections.entries()]
    .map(([type, { label, items }]) => ({
      type,
      label,
      items: items.sort((a, b) => byName(a.label, b.label)),
    }))
    .sort((a, b) => byName(a.label, b.label))

  return (
    <div className="flex flex-col gap-4">
      <SortToggle mode={mode} onChange={setMode} />
      {mode === 'driver' ? (
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
      ) : (
        entitySections.map(({ type, label, items }) => {
          const open = !isCollapsed(type)
          const listId = `devices-${type}`
          return (
            <section key={type} className="flex flex-col gap-2">
              <h2>
                <button
                  type="button"
                  aria-expanded={open}
                  aria-controls={listId}
                  onClick={() => toggle(type)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-1 text-left text-sm font-medium"
                >
                  {label}
                  <ChevronDown
                    aria-hidden="true"
                    className={`text-muted size-4 shrink-0 transition-transform ${open ? '' : '-rotate-90'}`}
                  />
                </button>
              </h2>
              {open && (
                <ul id={listId} className="flex flex-col gap-2">
                  {items.map(({ key, label: itemLabel, driver, open: openItem }) => (
                    <li key={key} className={driver.dim ? 'opacity-60' : ''}>
                      <GroupRow
                        label={itemLabel}
                        description={`Driver: ${driver.name}`}
                        statusTone={DRIVER_TONE[driver.tone]}
                        onOpen={openItem}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}
