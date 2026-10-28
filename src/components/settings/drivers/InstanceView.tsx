import { ChevronRight } from 'lucide-react'
import { Button } from '@heroui/react'
import { instanceLabel, ownerName, type InstanceType } from '@/lib/instances'
import type { Battery, Charger, Solar } from '@/types'
import { formatYieldAmount } from '@/components/widgets/solar/solarView'
import { DetailList, DetailRow } from '../shared/DetailList'
import { useSettingsData } from '../SettingsContext'
import type { SettingsSubView } from '../views'
import { GpsDetails } from './GpsView'
import { RelayDetails } from './RelaysView'
import { TemperatureDetails } from './TemperatureView'
import { amps, chargeStateLabel, measured, volts } from './instanceReadings'

/** One headline reading: its label, the number (`null` while not published) and its unit. */
type Stat = [label: string, value: string | null, unit: string]

const fixed = (digits: number) => (n: number) => n.toFixed(digits)
const whole = (n: number) => String(Math.round(n))

/** The headline readings of one instance, in the order they sit along the top of its page. */
function statsOf(
  type: InstanceType,
  record: Record<string, unknown>,
): { stats: Stat[]; rows: [label: string, value: string | null][] } {
  if (type === 'solar') {
    const solar = record as Partial<Solar>
    const today =
      solar.yield_today_wh === undefined ? undefined : formatYieldAmount(solar.yield_today_wh)
    return {
      stats: [
        [
          'State',
          solar.charge_state === undefined ? null : chargeStateLabel(solar.charge_state),
          '',
        ],
        ['Yield today', today?.value ?? null, today?.unit ?? 'kWh'],
        ['Voltage', measured(solar.pv_voltage_v, fixed(2)), 'V'],
        ['Current', measured(solar.pv_current_a, fixed(1)), 'A'],
        ['PV power', measured(solar.power_w, whole), 'W'],
      ],
      rows: [
        [
          'Battery',
          solar.battery_voltage_v === undefined
            ? null
            : `${volts(solar.battery_voltage_v)} · ${solar.battery_current_a === undefined ? '—' : amps(solar.battery_current_a)}`,
        ],
      ],
    }
  }
  if (type === 'charger') {
    const charger = record as Partial<Charger>
    return {
      stats: [
        [
          'State',
          charger.charge_state === undefined ? null : chargeStateLabel(charger.charge_state),
          '',
        ],
        ['Voltage', measured(charger.voltage_v, fixed(2)), 'V'],
        ['Current', measured(charger.current_a, fixed(1)), 'A'],
        ['Power', measured(charger.power_w, whole), 'W'],
        ['Input', measured(charger.input_voltage_v, fixed(2)), 'V'],
      ],
      rows: [['Source', charger.source ?? null]],
    }
  }
  const battery = record as Partial<Battery>
  return {
    stats: [
      ['Charge', measured(battery.soc_pct, whole), '%'],
      ['Voltage', measured(battery.voltage_v, fixed(2)), 'V'],
      ['Current', measured(battery.current_a, fixed(1)), 'A'],
      ['Power', measured(battery.power_w, whole), 'W'],
    ],
    rows: [['Temperature', measured(battery.temperature_c, (n) => `${n.toFixed(1)} °C`)]],
  }
}

/**
 * Settings › Devices › <type> › one instance: its headline readings in a strip (the way a Victron
 * panel leads with State, Yield, Voltage…), the rows that say more, and for a solar controller a
 * History row that opens its daily harvest. The page a source on the Power page opens. A reading the
 * instance has not published reads `—`.
 */
export function InstanceView({
  type,
  id,
  onOpen,
}: {
  type: InstanceType
  id: string
  onOpen: (view: SettingsSubView) => void
}) {
  const { drivers, batteries, solar, chargers } = useSettingsData()
  if (type === 'gps') return <GpsDetails id={id} />
  if (type === 'temperature') return <TemperatureDetails id={id} />
  if (type === 'relay') return <RelayDetails id={id} />
  const record = (type === 'solar' ? solar : type === 'charger' ? chargers : batteries)[id]
  if (record === undefined) return null
  const { stats, rows } = statsOf(type, record)
  const label = instanceLabel(id, record, drivers)

  return (
    <div className="flex flex-col gap-3">
      <dl
        aria-label={`${label} readings`}
        className="border-border bg-surface grid grid-cols-2 gap-x-4 gap-y-4 rounded-2xl border px-3.5 py-4 sm:grid-cols-3 md:grid-cols-5"
      >
        {stats.map(([name, value, unit]) => (
          <div key={name} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-muted text-xs">{name}</dt>
            <dd className="truncate text-2xl font-semibold tabular-nums">
              {value ?? '—'}
              {value !== null && unit !== '' && (
                <span className="text-muted ml-1 text-base font-normal">{unit}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <DetailList label={`${label} details`}>
        {rows.map(([name, value]) => (
          <DetailRow key={name} label={name} value={value} />
        ))}
        <DetailRow label="Driver" value={ownerName(record, drivers) ?? null} />
      </DetailList>
      {type === 'solar' && (
        <div className="border-border bg-surface overflow-hidden rounded-2xl border">
          <Button
            variant="ghost"
            fullWidth
            onPress={() => onOpen('instance-history')}
            className="h-auto! min-h-11 justify-between! gap-3! rounded-none! px-3.5! py-3! text-sm font-medium"
          >
            History
            <ChevronRight aria-hidden="true" className="text-muted size-4 shrink-0" />
          </Button>
        </div>
      )}
    </div>
  )
}
