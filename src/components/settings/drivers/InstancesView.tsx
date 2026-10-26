import { useId } from 'react'
import { instanceLabel, ownerName } from '@/lib/instances'
import { compareInstanceIds, primaryBattery } from '@/lib/primaryBattery'
import type { Battery, Charger, Solar } from '@/types'
import { formatTimeToGo } from '@/lib/time-to-go'
import { formatYield } from '@/components/widgets/solar/solarView'
import { DetailRow } from '../shared/DetailList'
import { Card, ChoiceRow } from '../shared/ChoiceRow'
import { Group } from '../shared/Group'
import { useSettingsData, useSettingsActions } from '../SettingsContext'

/** The entity types the generic instances view lists. */
export type InstanceType = 'battery' | 'solar' | 'charger'

const EMPTY_TEXT: Record<InstanceType, string> = {
  battery: 'No batteries found. Waiting for a Driver to publish.',
  solar: 'No solar controllers found. Waiting for a Driver to publish.',
  charger: 'No chargers found. Waiting for a Driver to publish.',
}

const LIST_LABEL: Record<InstanceType, string> = {
  battery: 'Batteries',
  solar: 'Solar',
  charger: 'Chargers',
}

type Reading = [label: string, value: string | null]

const measured = (value: number | undefined, format: (n: number) => string): string | null =>
  value === undefined ? null : format(value)

const watts = (n: number) => `${Math.round(n)} W`
const volts = (n: number) => `${n.toFixed(2)} V`
const amps = (n: number) => `${n.toFixed(1)} A`

/** The key live readings of a battery: the four core measurements, then what its source adds. */
function batteryReadings(battery: Partial<Battery>): Reading[] {
  const readings: Reading[] = [
    ['State of charge', measured(battery.soc_pct, (n) => `${Math.round(n)} %`)],
    ['Voltage', measured(battery.voltage_v, volts)],
    ['Current', measured(battery.current_a, amps)],
    ['Power', measured(battery.power_w, watts)],
  ]
  if (battery.temperature_c !== undefined) {
    readings.push(['Temperature', `${battery.temperature_c.toFixed(1)} °C`])
  }
  if (battery.time_to_go_s !== undefined) {
    readings.push(['Time to go', formatTimeToGo(battery.time_to_go_s)])
  }
  return readings
}

function solarReadings(solar: Partial<Solar>): Reading[] {
  return [
    ['Power', measured(solar.power_w, watts)],
    [
      'Yield today',
      solar.yield_today_wh === undefined ? null : `${formatYield(solar.yield_today_wh)} kWh`,
    ],
  ]
}

function chargerReadings(charger: Partial<Charger>): Reading[] {
  return [
    ['Voltage', measured(charger.voltage_v, volts)],
    ['Current', measured(charger.current_a, amps)],
  ]
}

interface InstanceRecord {
  name?: string
  driver?: string
}

interface InstanceEntry {
  id: string
  record: InstanceRecord
  readings: Reading[]
}

/** The instances of one type in id order, each with its readings. */
function entriesOf<T extends InstanceRecord>(
  records: Record<string, T>,
  readings: (record: T) => Reading[],
): InstanceEntry[] {
  return Object.keys(records)
    .sort(compareInstanceIds)
    .map((id) => ({ id, record: records[id], readings: readings(records[id]) }))
}

function InstanceCard({
  label,
  owner,
  readings,
}: {
  label: string
  owner: string | undefined
  readings: Reading[]
}) {
  const labelId = useId()
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="border-border bg-surface overflow-hidden rounded-2xl border"
    >
      <div className="flex flex-col gap-0.5 px-3.5 py-3">
        <span id={labelId} className="text-sm font-medium">
          {label}
        </span>
        <span className="text-muted text-xs">Driver: {owner ?? '—'}</span>
      </div>
      <dl
        aria-label={`${label} readings`}
        className="border-border divide-border divide-y border-t"
      >
        {readings.map(([name, value]) => (
          <DetailRow key={name} label={name} value={value} />
        ))}
      </dl>
    </div>
  )
}

/**
 * Settings › Drivers › Batteries, Solar or Chargers: every instance of one entity type on the bus,
 * read-only, whichever Driver publishes it (so one bank's two sources sit side by side). A card per
 * instance: its label, its owning Driver and its live key readings; a measurement the instance has
 * not published reads `—`. The batteries view also hosts the shared Primary battery selector, once
 * there is more than one battery to choose between.
 */
export function InstancesView({ type }: { type: InstanceType }) {
  const { drivers, batteries, solar, chargers } = useSettingsData()
  const entries =
    type === 'battery'
      ? entriesOf(batteries, batteryReadings)
      : type === 'solar'
        ? entriesOf(solar, solarReadings)
        : entriesOf(chargers, chargerReadings)

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
        {entries.map(({ id, record, readings }) => (
          <li key={id}>
            <InstanceCard
              label={instanceLabel(id, record, drivers)}
              owner={ownerName(record, drivers)}
              readings={readings}
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
