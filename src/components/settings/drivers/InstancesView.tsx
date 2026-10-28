import { instanceKey, instanceLabel, ownerName, type InstanceType } from '@/lib/instances'
import { AUTO_PRIMARY_BATTERY, compareInstanceIds } from '@/lib/primaryBattery'
import { batterySummary, chargerSummary, solarSummary } from './entitySummary'
import { EntityCard, type Figure } from '../shared/EntityCard'
import { GroupRow } from '../shared/GroupRow'
import { useSettingsData } from '../SettingsContext'

/** The types this view lists; GPS, temperature and relays have a view of their own. */
type ListedType = Extract<InstanceType, 'battery' | 'solar' | 'charger'>

const EMPTY_TEXT: Record<ListedType, string> = {
  battery: 'No batteries found. Waiting for a Driver to publish.',
  solar: 'No solar controllers found. Waiting for a Driver to publish.',
  charger: 'No chargers found. Waiting for a Driver to publish.',
}

const LIST_LABEL: Record<ListedType, string> = {
  battery: 'Batteries',
  solar: 'Solar',
  charger: 'Chargers',
}

interface InstanceRecord {
  name?: string
  driver?: string
}

interface InstanceEntry {
  id: string
  record: InstanceRecord
  summary: Figure[]
}

/** The instances of one type in id order, each with its readings. */
function entriesOf<T extends InstanceRecord>(
  records: Record<string, T>,
  summary: (record: T) => Figure[],
): InstanceEntry[] {
  return Object.keys(records)
    .sort(compareInstanceIds)
    .map((id) => ({ id, record: records[id], summary: summary(records[id]) }))
}

/**
 * Settings › Drivers › Batteries, Solar or Chargers: every instance of one entity type on the bus,
 * read-only, whichever Driver publishes it (so one bank's two sources sit side by side). A card per
 * instance: its label, its owning Driver and its live key readings; a measurement the instance has
 * not published reads `—`. Each card opens the instance's own page (`InstanceView`). The batteries
 * view also leads with a Primary battery row, once there is more than one battery to choose between,
 * which opens the page where the shared choice is made (`PrimaryBatteryView`).
 */
export function InstancesView({
  type,
  onOpen,
  onOpenPrimaryBattery,
}: {
  type: ListedType
  /** Opens one instance's own page, by its `instanceKey`. */
  onOpen: (key: string) => void
  /** Opens the Primary battery page; only the batteries view uses it. */
  onOpenPrimaryBattery?: () => void
}) {
  const { drivers, batteries, solar, chargers, primaryBatterySelection } = useSettingsData()
  const entries =
    type === 'battery'
      ? entriesOf(batteries, batterySummary)
      : type === 'solar'
        ? entriesOf(solar, solarSummary)
        : entriesOf(chargers, chargerSummary)

  // What the row says: Auto, or the chosen battery labelled like its card (its bare id while it is absent).
  const chosen = entries.find(({ id }) => id === primaryBatterySelection)
  const primaryChoiceLabel =
    primaryBatterySelection === AUTO_PRIMARY_BATTERY
      ? 'Auto'
      : chosen === undefined
        ? primaryBatterySelection
        : instanceLabel(chosen.id, chosen.record, drivers)

  if (entries.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        {EMPTY_TEXT[type]}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {type === 'battery' && entries.length > 1 && onOpenPrimaryBattery && (
        <GroupRow
          label="Primary battery"
          description={primaryChoiceLabel}
          onOpen={onOpenPrimaryBattery}
        />
      )}
      <ul aria-label={LIST_LABEL[type]} className="flex flex-col gap-2">
        {entries.map(({ id, record, summary }) => (
          <li key={id}>
            <EntityCard
              label={instanceLabel(id, record, drivers)}
              subtitle={`Driver: ${ownerName(record, drivers) ?? '—'}`}
              summary={summary}
              onOpen={() => onOpen(instanceKey(type, id))}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}
