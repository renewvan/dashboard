import { tiltReading } from '@/lib/tilt'
import { FLUID_LABELS } from '@/lib/tank-labels'
import { CHARGING_LABELS, type Charging, type ChargingKind } from '@/lib/charging'
import {
  POWER_SOURCE_LABELS,
  powerOf,
  type ChargerSlot,
  type PowerSlot,
  type PowerSource,
  type RingSource,
  type StartCentre,
} from '@/hooks/useStartPowerSources'
import type { Tilt } from '@/types'

/** One half-moon reading as drawn: a dash and an empty band until its source has published. */
export interface PowerReading {
  /** What the reading is, and so its icon: a configured power source or the charger present. */
  source: PowerSource | ChargingKind
  label: string
  /** Whole watts; `undefined` while the source has not published (never a made-up 0). */
  watts: number | undefined
  /** 0..100: the band's fill, 0 while there is no reading. */
  pct: number
}

function reading(
  source: PowerReading['source'],
  label: string,
  watts: number | undefined,
  fullScaleW: number,
): PowerReading {
  return {
    source,
    label,
    watts: watts === undefined ? undefined : Math.round(watts),
    pct: watts === undefined ? 0 : Math.min(100, (watts / fullScaleW) * 100),
  }
}

/** `slot`'s reading from the live solar and battery watts. */
export function powerReading(
  slot: PowerSlot,
  solarW: number | undefined,
  batteryW: number | undefined,
): PowerReading {
  return reading(
    slot.source,
    POWER_SOURCE_LABELS[slot.source],
    powerOf(slot.source, solarW, batteryW),
    slot.fullScaleW,
  )
}

/** The charging reading (alternator or shore charger), named for the charger that is present. */
export function chargingReading(slot: ChargerSlot, present: Charging): PowerReading {
  return reading(present.kind, CHARGING_LABELS[present.kind], present.watts, slot.fullScaleW)
}

/** The label a ring wears: the battery, or the tank's full name (`Fresh water`). */
export function ringLabel(source: RingSource): string {
  return source === 'battery' ? 'Battery' : FLUID_LABELS[source]
}

/** A tilt record with both angles usable now (`status ok`, finite); stale retained angles do not count. */
export function hasTiltReading(tilt: Partial<Tilt> | undefined): boolean {
  const { roll, pitch } = tiltReading(tilt)
  return roll !== null && pitch !== null
}

/**
 * What fills the middle of the rings: whatever is chosen, except that the tilt, with no usable
 * reading, gives way to the battery's readout rather than leaving the middle empty.
 */
export type CentreKind = 'van' | 'tilt' | 'battery'

export function centreKind(choice: StartCentre, tilt: Partial<Tilt> | undefined): CentreKind {
  if (choice === 'tilt') return hasTiltReading(tilt) ? 'tilt' : 'battery'
  return choice
}

/**
 * The ring indices listed under the arc. Only the battery's own readout in the middle takes the
 * battery out of the list; with the tilt or the van there, every ring is listed so the battery %
 * stays visible somewhere.
 */
export function legendIndices(rings: readonly RingSource[], centre: CentreKind): number[] {
  return rings.flatMap((source, index) =>
    centre === 'battery' && source === 'battery' ? [] : [index],
  )
}
