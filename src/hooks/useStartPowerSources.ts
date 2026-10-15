import { useEffect, useState } from 'react'
import type { FluidType } from '@/types'

/**
 * What a power reading on the Start page is taken from. The bus carries no shore, alternator,
 * inverter or AC-load topics, so these are the only flows that exist: the solar controller's
 * power, and the battery's signed power split by direction.
 */
export type PowerSource = 'solar' | 'battery-in' | 'battery-out' | 'battery-net'

export const POWER_SOURCES: readonly PowerSource[] = [
  'solar',
  'battery-in',
  'battery-out',
  'battery-net',
]

export const POWER_SOURCE_LABELS: Record<PowerSource, string> = {
  solar: 'Solar',
  'battery-in': 'Charging',
  'battery-out': 'Load',
  'battery-net': 'Battery net',
}

/** One reading's configuration: where its watts come from and what wattage fills its band. */
export interface PowerSlot {
  source: PowerSource
  /** Watts that fill the band; the band is a fraction of this, never a nameplate. */
  fullScaleW: number
}

/** What a centre ring shows: the battery's charge, or the level of one kind of tank. */
export type RingSource = 'battery' | FluidType

export const RING_SOURCES: readonly RingSource[] = [
  'battery',
  'fresh_water',
  'grey_water',
  'black_water',
  'fuel',
  'lpg',
]

/** A tank ring's value as a percentage of its capacity, or as the litres in it. */
export type RingUnit = 'pct' | 'litres'

export const RING_UNITS: readonly RingUnit[] = ['pct', 'litres']

/** The three readings of the half-moons: two incoming on the left, one outgoing on the right. */
export interface StartPowerSources {
  leftTop: PowerSlot
  leftBottom: PowerSlot
  right: PowerSlot
  /** The three centre rings, outermost first. */
  rings: [RingSource, RingSource, RingSource]
  /** How a tank ring's value reads. The battery has no volume, so it is always a percentage. */
  ringUnit: RingUnit
}

export const MIN_FULL_SCALE_W = 50
export const MAX_FULL_SCALE_W = 20_000

export const DEFAULT_START_POWER_SOURCES: StartPowerSources = {
  leftTop: { source: 'solar', fullScaleW: 400 },
  leftBottom: { source: 'battery-in', fullScaleW: 1000 },
  right: { source: 'battery-out', fullScaleW: 1000 },
  rings: ['battery', 'fresh_water', 'grey_water'],
  ringUnit: 'pct',
}

const STORAGE_KEY = 'renewvan-dashboard-start-power-sources'

const SLOT_KEYS = ['leftTop', 'leftBottom', 'right'] as const

function isPowerSource(value: unknown): value is PowerSource {
  return POWER_SOURCES.some((source) => source === value)
}

function isRingSource(value: unknown): value is RingSource {
  return RING_SOURCES.some((source) => source === value)
}

function isRingUnit(value: unknown): value is RingUnit {
  return RING_UNITS.some((unit) => unit === value)
}

/** Clamps into the allowed range; a scale is a whole number of watts. */
export function clampFullScale(watts: number): number {
  return Math.min(MAX_FULL_SCALE_W, Math.max(MIN_FULL_SCALE_W, Math.round(watts)))
}

/**
 * Reads the stored value defensively: `localStorage` is user-editable and outlives deploys, so
 * anything missing, malformed or out of range falls back to that slot's default, slot by slot (one
 * bad slot never resets the others).
 */
export function parseStartPowerSources(raw: string | null): StartPowerSources {
  const defaults = DEFAULT_START_POWER_SOURCES
  if (raw === null) return defaults
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return defaults
  }
  if (typeof parsed !== 'object' || parsed === null) return defaults
  const record = parsed as Record<string, unknown>

  const slot = (key: (typeof SLOT_KEYS)[number]): PowerSlot => {
    const stored = record[key]
    if (typeof stored !== 'object' || stored === null) return defaults[key]
    const { source, fullScaleW } = stored as Record<string, unknown>
    return {
      source: isPowerSource(source) ? source : defaults[key].source,
      fullScaleW:
        typeof fullScaleW === 'number' && Number.isFinite(fullScaleW)
          ? clampFullScale(fullScaleW)
          : defaults[key].fullScaleW,
    }
  }
  // Ring by ring, like the slots: one unknown fluid does not reset the other two rings.
  const storedRings = Array.isArray(record.rings) ? (record.rings as unknown[]) : []
  const ring = (index: 0 | 1 | 2): RingSource => {
    const stored = storedRings[index]
    return isRingSource(stored) ? stored : defaults.rings[index]
  }

  return {
    leftTop: slot('leftTop'),
    leftBottom: slot('leftBottom'),
    right: slot('right'),
    rings: [ring(0), ring(1), ring(2)],
    ringUnit: isRingUnit(record.ringUnit) ? record.ringUnit : defaults.ringUnit,
  }
}

function readStored(): StartPowerSources {
  if (typeof window === 'undefined') return DEFAULT_START_POWER_SOURCES
  return parseStartPowerSources(window.localStorage.getItem(STORAGE_KEY))
}

/**
 * Where the Start page's half-moon readings come from and how full each band reads. Kiosk-local
 * preference with no bus topic, persisted like `useNavbarPosition`. Settings › General › Display & Appearance ›
 * Start page edits it; the Start page reads the same instance through `App`.
 */
export function useStartPowerSources(): [StartPowerSources, (next: StartPowerSources) => void] {
  const [sources, setSources] = useState<StartPowerSources>(readStored)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sources))
  }, [sources])

  return [sources, setSources]
}

/** Watts for one slot from the live records; `undefined` while its source has not arrived. */
export function powerOf(
  source: PowerSource,
  solarW: number | undefined,
  batteryW: number | undefined,
): number | undefined {
  switch (source) {
    case 'solar':
      return solarW
    case 'battery-in':
      return batteryW === undefined ? undefined : Math.max(0, batteryW)
    case 'battery-out':
      return batteryW === undefined ? undefined : Math.max(0, -batteryW)
    case 'battery-net':
      return batteryW === undefined ? undefined : Math.abs(batteryW)
  }
}
