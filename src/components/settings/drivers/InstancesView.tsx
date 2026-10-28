import { instanceKey, instanceLabel, ownerName, type InstanceType } from '@/lib/instances'
import { compareInstanceIds, primaryBattery } from '@/lib/primaryBattery'
import { batterySummary, chargerSummary, solarSummary } from './entitySummary'
import { EntityCard, type Figure } from '../shared/EntityCard'
import { Card, ChoiceRow } from '../shared/ChoiceRow'
import { Group } from '../shared/Group'
import { useSettingsData, useSettingsActions } from '../SettingsContext'

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
 * not published reads `—`. Each card opens the instance's own page (`InstanceView`). The batteries view also hosts the shared Primary battery selector, once
 * there is more than one battery to choose between.
 */
export function InstancesView({
  type,
  onOpen,
}: {
  type: ListedType
  /** Opens one instance's own page, by its `instanceKey`. */
  onOpen: (key: string) => void
}) {
  const { drivers, batteries, solar, chargers } = useSettingsData()
  const entries =
    type === 'battery'
      ? entriesOf(batteries, batterySummary)
      : type === 'solar'
        ? entriesOf(solar, solarSummary)
        : entriesOf(chargers, chargerSummary)

  if (entries.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        {EMPTY_TEXT[type]}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {type === 'battery' && entries.length > 1 && (
        <PrimaryBatterySelector
          instances={entries.map(({ id, record }) => ({
            value: id,
            label: instanceLabel(id, record, drivers),
          }))}
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

/**
 * The shared Primary battery: Auto or one of the batteries on the bus. The choice is the hub's, so
 * every client follows it; the note says what is actually read now, which differs from the choice
 * while the chosen instance is absent or has not fully arrived.
 */
function PrimaryBatterySelector({ instances }: { instances: { value: string; label: string }[] }) {
  const { batteries, primaryBatterySelection } = useSettingsData()
  const { setPrimaryBattery } = useSettingsActions()
  const current = primaryBattery(batteries, primaryBatterySelection)
  const labelOf = (id: string) => instances.find((choice) => choice.value === id)?.label ?? id
  return (
    <Group title="Primary battery">
      <Card>
        <ChoiceRow
          label="Primary battery"
          choices={[{ value: 'auto', label: 'Auto' }, ...instances]}
          value={primaryBatterySelection}
          onChange={setPrimaryBattery}
        />
      </Card>
      {current !== undefined && (
        <p className="text-muted px-1 text-sm">
          {current.mode === 'fallback'
            ? `${primaryBatterySelection} is not available, using ${labelOf(current.id)}`
            : `Reading from ${labelOf(current.id)}`}
        </p>
      )}
    </Group>
  )
}
