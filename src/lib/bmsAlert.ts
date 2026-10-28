import type { Battery, BmsProtection } from '@/types'

export const PROTECTION_LABELS: Record<BmsProtection, string> = {
  cell_overvoltage: 'Cell overvoltage',
  cell_undervoltage: 'Cell undervoltage',
  pack_overvoltage: 'Pack overvoltage',
  pack_undervoltage: 'Pack undervoltage',
  charge_overtemperature: 'Charge overtemperature',
  charge_undertemperature: 'Charge undertemperature',
  discharge_overtemperature: 'Discharge overtemperature',
  discharge_undertemperature: 'Discharge undertemperature',
  charge_overcurrent: 'Charge overcurrent',
  discharge_overcurrent: 'Discharge overcurrent',
  short_circuit: 'Short circuit',
  internal_fault: 'Internal fault',
  locked: 'Locked',
  cell_imbalance: 'Cell imbalance',
  overtemperature: 'Overtemperature',
  undertemperature: 'Undertemperature',
  other: 'Other protection',
}

/** A protection's label; a name outside the vocabulary reads as itself rather than vanishing. */
export const protectionLabel = (name: string): string =>
  PROTECTION_LABELS[name as BmsProtection] ?? name

/** Charge-side or maintenance protections: worth a look, not a stop (CONTEXT.md **BMS alert**). */
const ADVISORY = new Set<string>([
  'cell_imbalance',
  'charge_overtemperature',
  'charge_undertemperature',
  'charge_overcurrent',
])

export interface BmsAlert {
  tone: 'warning' | 'danger'
  /** Labels of the active protections, in the BMS's own order. */
  names: string[]
}

/**
 * The Primary battery's active protections as a glanceable alert, or `undefined` while there are none
 * (absent or `[]`). Takes the colour of the worst one; any name outside the advisory set, including
 * `other` and unrecognised names, is danger. Never reads `allow_charge` / `allow_discharge`: Venus
 * cannot tell a `false` from "not reporting". Callers pass the Primary battery only.
 */
export function bmsAlert(battery: Partial<Battery> | undefined): BmsAlert | undefined {
  const active = battery?.protections
  if (active === undefined || active.length === 0) return undefined
  return {
    tone: active.every((name) => ADVISORY.has(name)) ? 'warning' : 'danger',
    names: active.map(protectionLabel),
  }
}
