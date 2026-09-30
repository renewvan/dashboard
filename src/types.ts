// v0.1 device-model entity shapes, per hub/schema/*.schema.json. Tank
// mirrors hub schema v0.5 (level_pct_smoothed, fill_rate_lpm,
// drain_rate_lpm, volume_since_full_l, volume_since_empty_l added as
// unconditional live fields; last_full_date/last_empty_date renamed to
// last_full_at/last_empty_at with full ISO-8601 timestamps; alarm_direction/
// alarm_threshold_pct/alarm_restore_pct added as retained identity fields,
// per docs/adr/0004 in hub -- see lib/tank-alarm.ts for how these replace
// the former hardcoded TANK_ALARM_CONFIGS mirror).
// Each entity is keyed by `id` (the topic's path segment, never a payload
// field) — see hub/CONTEXT.md's Entity/topic-convention terms.

export type FluidType = 'fresh_water' | 'grey_water' | 'black_water' | 'fuel' | 'lpg'
export type TankStatus = 'ok' | 'open_circuit' | 'short_circuit'
/** Hub-computed alarm state, per hub/schema/tank.schema.json. Optional on
 * the wire — tanks without alarm config configured never publish it. */
export type TankAlarmState = 'ok' | 'alarm'
/** Which side of the threshold triggers alarm; see alarm_threshold_pct. */
export type TankAlarmDirection = 'low' | 'high'

export interface Tank {
  fluid_type: FluidType
  capacity_l: number
  /** Raw sender reading. Alarms/thresholds and `tank-alarm.ts`'s liquid-color
   * banding key off this, never `level_pct_smoothed` — per schema. */
  level_pct: number
  /** Rate-extrapolated display value for stepped/reed-switch senders —
   * what the card actually shows as "the level" (fill height, %, liters).
   * Display-only; never used for alarm/threshold logic. */
  level_pct_smoothed: number
  status: TankStatus
  fill_rate_lpm: number
  drain_rate_lpm: number
  /** Net liters moved since the last committed full latch — TankCard's "Fill Rate" field, despite the name (a volume, not a rate). */
  volume_since_full_l: number
  /** Net liters moved since the last committed empty latch — TankCard's "Drain Rate" field. */
  volume_since_empty_l: number
  alarm_state?: TankAlarmState
  /** Which side of alarm_threshold_pct triggers alarm. Retained/static,
   * published once at startup. Present under the same condition as
   * alarm_state (a tank with alarm configured). */
  alarm_direction?: TankAlarmDirection
  /** level_pct value that trips alarm_state to 'alarm' (inclusive). Retained/static. */
  alarm_threshold_pct?: number
  /** level_pct value that clears alarm_state back to 'ok' (inclusive); the
   * open band between alarm_threshold_pct and alarm_restore_pct is the
   * caution zone (see lib/tank-alarm.ts). Retained/static. */
  alarm_restore_pct?: number
  /** Most recent auto-detected sustained full crossing, ISO-8601 with local UTC offset. Optional — only present once the tank has latched full at least once. TankCard's footer date for fresh_water ("Last refilled"). */
  last_full_at?: string
  /** Most recent auto-detected sustained empty crossing, ISO-8601 with local UTC offset. Optional — only present once the tank has latched empty at least once. TankCard's footer date for grey/black_water/fuel/lpg ("Last emptied"). */
  last_empty_at?: string
}

/**
 * MQTT builds each entity up one property per retained message; between
 * the first message for an id and the last, the accumulated record is a
 * `Partial<Tank>`, not a `Tank` — even though the store's type says
 * otherwise (see `RenewvanBusState`). Consumers must check this before
 * treating a record as render-ready, or risk a crash on the still-partial
 * fields (e.g. `undefined.toFixed`).
 */
export function isCompleteTank(tank: Partial<Tank>): tank is Tank {
  return (
    tank.fluid_type !== undefined &&
    tank.capacity_l !== undefined &&
    tank.level_pct !== undefined &&
    tank.level_pct_smoothed !== undefined &&
    tank.status !== undefined &&
    tank.fill_rate_lpm !== undefined &&
    tank.drain_rate_lpm !== undefined &&
    tank.volume_since_full_l !== undefined &&
    tank.volume_since_empty_l !== undefined
  )
}

export type ChargeState =
  | 'off'
  | 'low_power'
  | 'fault'
  | 'bulk'
  | 'absorption'
  | 'float'
  | 'storage'
  | 'equalize'
  | 'passthru'
  | 'inverting'
  | 'assisting'
  | 'sustain'
  | 'external_control'
  | 'discharging'
  | 'sustain_ess'
  | 'recharge'
  | 'scheduled_recharge'
  | 'unknown'

export interface Battery {
  soc_pct: number
  voltage_v: number
  current_a: number
  power_w: number
  temperature_c: number
  charge_state: ChargeState
}

/** Same partial-accumulation caveat as {@link isCompleteTank}. */
export function isCompleteBattery(battery: Partial<Battery>): battery is Battery {
  return (
    battery.soc_pct !== undefined &&
    battery.voltage_v !== undefined &&
    battery.current_a !== undefined &&
    battery.power_w !== undefined &&
    battery.temperature_c !== undefined &&
    battery.charge_state !== undefined
  )
}

export interface Relay {
  state: boolean
}

/** Live state of the renewvan bus, keyed by entity id within each domain. */
export interface RenewvanBusState {
  tanks: Record<string, Tank>
  batteries: Record<string, Battery>
  relays: Record<string, Relay>
}

export const emptyRenewvanBusState: RenewvanBusState = {
  tanks: {},
  batteries: {},
  relays: {},
}
