import { tiltReading } from '@/lib/tilt'
import { FLUID_LABELS } from '@/lib/tank-labels'
import {
  POWER_SOURCE_LABELS,
  powerOf,
  type PowerSlot,
  type PowerSource,
  type RingSource,
} from '@/hooks/useStartPowerSources'
import type { Tilt } from '@/types'

/** One half-moon reading as drawn: a dash and an empty band until its source has published. */
export interface PowerReading {
  source: PowerSource
  label: string
  /** Whole watts; `undefined` while the source has not published (never a made-up 0). */
  watts: number | undefined
  /** 0..100: the band's fill, 0 while there is no reading. */
  pct: number
}

/** `slot`'s reading from the live solar and battery watts. */
export function powerReading(
  slot: PowerSlot,
  solarW: number | undefined,
  batteryW: number | undefined,
): PowerReading {
  const watts = powerOf(slot.source, solarW, batteryW)
  return {
    source: slot.source,
    label: POWER_SOURCE_LABELS[slot.source],
    watts: watts === undefined ? undefined : Math.round(watts),
    pct: watts === undefined ? 0 : Math.min(100, (watts / slot.fullScaleW) * 100),
  }
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

/** What fills the middle of the rings: the van's tilt while it has a reading, else the battery. */
export type CentreKind = 'tilt' | 'battery'

export function centreKind(tilt: Partial<Tilt> | undefined): CentreKind {
  return hasTiltReading(tilt) ? 'tilt' : 'battery'
}

/**
 * The ring indices listed under the arc. While the battery readout fills the middle, the battery is
 * not repeated there; with the tilt in the middle, every ring is listed so the battery % stays
 * visible somewhere.
 */
export function legendIndices(rings: readonly RingSource[], centre: CentreKind): number[] {
  return rings.flatMap((source, index) =>
    centre === 'battery' && source === 'battery' ? [] : [index],
  )
}
