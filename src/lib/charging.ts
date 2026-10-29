import { isCompleteCharger, type Charger } from '@/types'

/**
 * What feeds the Start page's charging reading: the alternator or the shore charger when only one is
 * charging, `chargers` (both, summed) when both are.
 */
export type ChargingKind = 'alternator' | 'shore' | 'chargers'

export const CHARGING_LABELS: Record<ChargingKind, string> = {
  alternator: 'Alternator',
  shore: 'Shore power',
  chargers: 'Chargers',
}

export interface Charging {
  kind: ChargingKind
  /** Output watts into the battery; `undefined` while the charger has published neither power nor current. */
  watts: number | undefined
}

/** Output watts: the published `power_w`, else voltage × current (driver-venus publishes no `power_w`). */
export function chargerWatts(charger: Charger): number | undefined {
  if (charger.power_w !== undefined) return charger.power_w
  if (charger.current_a === undefined) return undefined
  return Math.max(0, charger.voltage_v * charger.current_a)
}

type SingleKind = Exclude<ChargingKind, 'chargers'>

function kindOf(charger: Charger): SingleKind | undefined {
  if (charger.source === 'alternator') return 'alternator'
  if (charger.source === 'ac') return 'shore'
  return undefined
}

/**
 * The charging reading: what the van's chargers put into the battery. With one charger above
 * `activeW` it is that charger, named (so you can tell driving from plugged in); with both above it,
 * their sum as `chargers`, so a charging shore charger is never hidden behind the alternator or the
 * other way round. With neither above it (both idle, or no watts published) the alternator is named,
 * or the shore charger when it is the only one: the reading stays, and never changes name while the
 * van is quiet. A charger that has published no watts counts as inactive and adds nothing to the sum.
 * A `dc`/`unknown`/not-yet-published source is neither, so it shows nothing (MQTT builds a record up
 * one property at a time, so `source` can lag `voltage_v`).
 */
export function charging(
  chargers: Record<string, Partial<Charger>>,
  activeW: number,
): Charging | undefined {
  const found = Object.values(chargers)
    .filter(isCompleteCharger)
    .flatMap((charger) => {
      const kind = kindOf(charger)
      return kind ? [{ kind, watts: chargerWatts(charger) }] : []
    })
  const alternator = found.find((c) => c.kind === 'alternator')
  const shore = found.find((c) => c.kind === 'shore')
  const active = found.filter((c) => (c.watts ?? 0) > activeW)
  if (active.length > 1) {
    return { kind: 'chargers', watts: active.reduce((sum, c) => sum + (c.watts ?? 0), 0) }
  }
  return active[0] ?? alternator ?? shore
}
