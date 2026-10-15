import { isCompleteCharger, type Charger } from '@/types'

/** Which charger feeds the Start page's charging reading; the alternator wins when both are present. */
export type ChargingKind = 'alternator' | 'shore'

export const CHARGING_LABELS: Record<ChargingKind, string> = {
  alternator: 'Alternator',
  shore: 'Shore Charger',
}

export interface Charging {
  kind: ChargingKind
  /** Output watts into the battery; `undefined` while the charger has published neither power nor current. */
  watts: number | undefined
}

/** Output watts: the published `power_w`, else voltage × current (node-venus publishes no `power_w`). */
export function chargerWatts(charger: Charger): number | undefined {
  if (charger.power_w !== undefined) return charger.power_w
  if (charger.current_a === undefined) return undefined
  return Math.max(0, charger.voltage_v * charger.current_a)
}

function kindOf(charger: Charger): ChargingKind | undefined {
  if (charger.source === 'alternator') return 'alternator'
  if (charger.source === 'ac') return 'shore'
  return undefined
}

/**
 * The charger the charging reading follows: the first alternator, else the first shore charger. A
 * `dc`/`unknown`/not-yet-published source is neither, so it shows nothing (MQTT builds a record up
 * one property at a time, so `source` can lag `voltage_v`).
 */
export function charging(chargers: Record<string, Partial<Charger>>): Charging | undefined {
  const present = Object.values(chargers).filter(isCompleteCharger)
  const alternator = present.find((c) => kindOf(c) === 'alternator')
  const charger = alternator ?? present.find((c) => kindOf(c) === 'shore')
  if (!charger) return undefined
  return { kind: kindOf(charger)!, watts: chargerWatts(charger) }
}
