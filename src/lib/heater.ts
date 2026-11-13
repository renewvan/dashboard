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

/** The two sensors a temperature mode can read; the hub's `mode` also carries Power (hub ADR 0021). */
export type HeaterSensor = Exclude<HeaterMode, 'power'>
export const HEATER_SENSORS: readonly HeaterSensor[] = [
  'heater_temperature',
  'external_temperature',
]

/**
 * What the heater does, as the Autoterm Comfort Control panel names it (manual §3.3-3.4). The hub's
 * `mode` is only the first two, with the temperature sensor folded in. Ventilation is a fan-only
 * start (`ventilating/set`), not a `mode`. Thermostat and Heat + ventilation have no hub field yet,
 * so they are listed to show the full set but cannot be commanded.
 */
export type OperatingMode =
  | 'power'
  | 'temperature'
  | 'ventilation'
  | 'heat_ventilation'
  | 'thermostat'
export const OPERATING_MODES: readonly {
  key: OperatingMode
  label: string
  supported: boolean
}[] = [
  { key: 'power', label: 'Power', supported: true },
  { key: 'temperature', label: 'Temperature', supported: true },
  { key: 'thermostat', label: 'Thermostat', supported: false },
  { key: 'heat_ventilation', label: 'Heat + ventilation', supported: false },
  { key: 'ventilation', label: 'Ventilation', supported: true },
]

/** The operating mode the heater reports: fan-only wins, else Power or Temperature from `mode`. */
export function operatingMode(heater: Heater): OperatingMode | undefined {
  if (heater.ventilating === true) return 'ventilation'
  if (heater.mode === undefined) return undefined
  return heater.mode === 'power' ? 'power' : 'temperature'
}

/**
 * Why a switch from `from` to `to` cannot happen while the heater is on, as the sentence for the
 * "stop first?" prompt, or nothing when it can. Comfort Control manual §3.3-3.4: "It is impossible
 * to switch to any of heating modes while heater is operating in ventilation mode" and the other
 * way round, so the heater has to be stopped first. Switching between heating modes, or any switch
 * with the heater off, is fine.
 */
export function modeSwitchBlock(
  heater: Heater,
  from: OperatingMode | undefined,
  to: OperatingMode,
): string | undefined {
  const on = heater.phase !== undefined && heater.phase !== 'off'
  if (!on || from === undefined || from === to) return undefined
  if (from === 'ventilation') {
    return 'The heater is running in ventilation mode and cannot switch to a heating mode while ventilating.'
  }
  if (to === 'ventilation') {
    return 'The heater is running in a heating mode and cannot switch to ventilation while heating.'
  }
  return undefined
}

/** Whether the temperature sensor cannot be changed: Power, Thermostat and Ventilation read none (manual §4.3). */
export function sensorLocked(mode: OperatingMode | undefined): boolean {
  return mode === 'power' || mode === 'thermostat' || mode === 'ventilation'
}

/** The sensor in use, or nothing in Power mode where no sensor is read. */
export function heaterSensor(heater: Heater): HeaterSensor | undefined {
  return heater.mode === 'heater_temperature' || heater.mode === 'external_temperature'
    ? heater.mode
    : undefined
}

/** The timer's quick choices as Venus OS offers them (minutes); 0 is Off. Manual §2.3: 30-720 min. */
export const TIMER_PRESETS = [30, 60, 90] as const

export function timerLabel(minutes: number): string {
  return minutes === 0 ? 'Off' : `${minutes} min`
}

/** Autoterm's two timers: `on` starts the heater after the time, `off` stops it after the time. */
export type HeaterTimerKind = 'on' | 'off'

/**
 * The page's timer, owned by whoever can act on it (today only the local dev heater: the hub has no
 * timer field). `minutes` is the armed time, 0 for none; `endsAt` is when the running countdown
 * fires, if one runs.
 */
export interface HeaterTimer {
  kind: HeaterTimerKind
  minutes: number
  endsAt: number | undefined
  onChange: (minutes: number) => void
  onKindChange: (kind: HeaterTimerKind) => void
}

export const SETPOINT_RANGE = { min: 1, max: 30 } as const
/** The levels the dial offers, as Venus does; the hub accepts 0-9 (ADR 0021) but 0 is not a level to run at. */
export const POWER_RANGE = { min: 1, max: 9 } as const

const MODE_DESCRIPTIONS: Record<OperatingMode, string> = {
  temperature: 'Maintain a target room temperature.',
  power: 'Run the heater at a fixed power level.',
  thermostat: 'Keep the room within set temperature limits.',
  heat_ventilation: 'Blend heating with ventilation support.',
  ventilation: 'Circulate air without active heating.',
}

/**
 * The line above Start/Stop, worded as Venus OS's heater page words it: what the selected mode does
 * while the heater is off, then live telemetry while it starts, runs and stops ("Heating to 15°C ·
 * room is 18°C"). Nothing when the heater is not reporting.
 */
export function statusLine(heater: Heater, mode: OperatingMode | undefined): string | undefined {
  if (!isReporting(heater)) return undefined
  if (hasError(heater)) return `Heater fault, error ${heater.error_code}.`
  const degrees = (c: number | undefined) => (c === undefined ? '--' : `${Math.round(c)}°C`)
  const room = degrees(heater.internal_temperature_c)
  switch (heater.phase) {
    case 'starting':
      return 'Starting heater...'
    case 'warming_up':
      return 'Warming up...'
    case 'shutting_down':
      return 'Cooling down before stopping...'
    case 'running':
      if (mode === 'ventilation') return `Ventilating · room is ${room}`
      if (mode === 'power') {
        return `Running at power level ${heater.power_level ?? '--'} · room is ${room}`
      }
      return `Heating to ${degrees(heater.setpoint_c)} · room is ${room}`
    default:
      return mode === undefined ? undefined : MODE_DESCRIPTIONS[mode]
  }
}

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

/** A running clock: `0:42`, `12:05`, or `1:02:05` from an hour up. */
export function formatClock(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds))
  const s = String(whole % 60).padStart(2, '0')
  const minutes = Math.floor(whole / 60)
  if (minutes < 60) return `${minutes}:${s}`
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}:${s}`
}
