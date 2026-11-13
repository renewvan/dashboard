import type { Battery, Charger } from '@/types'

/** The van's starter battery as the bus reports it. */
export interface StarterBattery {
  voltage: number
  /** The publishing driver's alarm says `low`; the dashboard applies no threshold of its own. */
  low: boolean
  /** Which entity it was read off: a battery monitor's aux input, or an alternator charger's input. */
  source: 'battery' | 'charger'
}

const sorted = <T>(records: Record<string, T>): T[] =>
  Object.keys(records)
    .sort()
    .map((id) => records[id])

/**
 * The starter battery: a battery monitor's aux input on it (SmartShunt `VS`, `starter_voltage_v`)
 * first, as it measures all the time, else an alternator (DC-DC) charger's input side
 * (`input_voltage_v`). Each comes with its own driver-decided alarm. First by sorted id, so the
 * reading never jumps between devices. `undefined` when nothing reports it.
 */
export function starterBattery(
  batteries: Record<string, Partial<Battery>>,
  chargers: Record<string, Partial<Charger>>,
): StarterBattery | undefined {
  const monitor = sorted(batteries).find((b) => b.starter_voltage_v !== undefined)
  if (monitor) {
    return {
      voltage: monitor.starter_voltage_v!,
      low: monitor.starter_voltage_alarm === 'low',
      source: 'battery',
    }
  }
  const charger = sorted(chargers).find(
    (c) => c.source === 'alternator' && c.input_voltage_v !== undefined,
  )
  if (charger) {
    return {
      voltage: charger.input_voltage_v!,
      low: charger.input_voltage_alarm === 'low',
      source: 'charger',
    }
  }
  return undefined
}
