import type { Heater, HeaterMode, HeaterPhase } from '@/types'

export const PHASE_LABELS: Record<HeaterPhase, string> = {
  off: 'Off',
  starting: 'Starting',
  warming_up: 'Warming up',
  running: 'Running',
  shutting_down: 'Shutting down',
}

export const MODE_LABELS: Record<HeaterMode, string> = {
  heater_temperature: 'Heater sensor',
  external_temperature: 'External probe',
  power: 'Fixed power',
}

export const SETPOINT_RANGE = { min: 1, max: 30 } as const
export const POWER_RANGE = { min: 0, max: 9 } as const

/** What the page calls the heater's state: the phase, else the raw code, else nothing. */
export function phaseLabel(heater: Heater): string | undefined {
  if (heater.ventilating === true) return 'Ventilating'
  if (heater.phase !== undefined) return PHASE_LABELS[heater.phase]
  return heater.status_code === undefined ? undefined : `Status ${heater.status_code}`
}

/**
 * Whether the heater is reporting at all. The Driver clears every live field after `stale_after_s`
 * without a valid status, so a heater with neither a phase nor a status code is unknown, not off.
 */
export function isReporting(heater: Heater): boolean {
  return heater.phase !== undefined || heater.status_code !== undefined
}

export function hasError(heater: Heater): boolean {
  return heater.error_code !== undefined && heater.error_code !== 0
}

/** A start is only accepted from `off` with no fault (hub ADR 0021). */
export function canStart(heater: Heater): boolean {
  return heater.phase === 'off' && heater.error_code === 0
}

/** Stop is always accepted, so it is offered whenever the heater is doing anything. */
export function canStop(heater: Heater): boolean {
  return heater.phase !== undefined && heater.phase !== 'off'
}

/** Settings writes are refused while shutting down and while ventilating. */
export function canChangeSettings(heater: Heater): boolean {
  return isReporting(heater) && heater.phase !== 'shutting_down' && heater.ventilating !== true
}

/** `value` stepped by `delta` and held inside the range, or `undefined` when that changes nothing. */
export function stepWithin(
  value: number,
  delta: number,
  range: { min: number; max: number },
): number | undefined {
  const next = Math.min(range.max, Math.max(range.min, value + delta))
  return next === value ? undefined : next
}

/** Runtime as `45 min` or `2 h 05 min`. */
export function formatRuntime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, '0')} min`
}
