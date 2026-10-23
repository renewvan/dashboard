import { isCompleteBattery, type Battery } from '@/types'

/** The Primary battery choice that lets the dashboard pick: the first complete battery by id. */
export const AUTO_PRIMARY_BATTERY = 'auto'

/**
 * How the Primary battery was arrived at: `auto` (the choice is Auto), `selected` (the chosen
 * instance is on the bus and complete) or `fallback` (a specific instance was chosen but is absent
 * or incomplete, so Auto picked instead).
 */
export type PrimaryBatteryMode = 'auto' | 'selected' | 'fallback'

export interface PrimaryBattery {
  id: string
  battery: Battery
  mode: PrimaryBatteryMode
}

// A fixed locale, not the browser's: every client must sort the same ids the same way.
const BY_ID = new Intl.Collator('en', { numeric: true })

export function compareInstanceIds(a: string, b: string): number {
  return BY_ID.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}

/** Ids of the batteries that have fully arrived, in the order Auto prefers them (`"9"` before `"10"`). */
export function completeBatteryIds(batteries: Record<string, Partial<Battery>>): string[] {
  return Object.keys(batteries)
    .filter((id) => isCompleteBattery(batteries[id]))
    .sort(compareInstanceIds)
}

/**
 * The battery the headline readouts (Start dial, Power page) are drawn from. The candidates are the
 * complete batteries (MQTT builds a record up one property at a time). `auto` is the first by sorted
 * id, never the arrival order, so a restart or a second source's late arrival cannot swap the
 * headline. A specific id is that instance while it is on the bus and complete, otherwise Auto's
 * pick with `mode: 'fallback'`. `undefined` while no battery is complete.
 */
export function primaryBattery(
  batteries: Record<string, Partial<Battery>>,
  selection: string = AUTO_PRIMARY_BATTERY,
): PrimaryBattery | undefined {
  const ids = completeBatteryIds(batteries)
  if (ids.length === 0) return undefined
  const asBattery = (id: string) => batteries[id] as Battery
  if (selection !== AUTO_PRIMARY_BATTERY && ids.includes(selection)) {
    return { id: selection, battery: asBattery(selection), mode: 'selected' }
  }
  const [id] = ids
  return {
    id,
    battery: asBattery(id),
    mode: selection === AUTO_PRIMARY_BATTERY ? 'auto' : 'fallback',
  }
}
