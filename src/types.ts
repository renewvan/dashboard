// v0.1 device-model entity shapes, per hub/schema/*.schema.json. Tank
// mirrors hub schema v0.7 (volume_since_full_l, volume_since_empty_l added
// as unconditional live fields; last_full_date/last_empty_date renamed to
// last_full_at/last_empty_at with full ISO-8601 timestamps; alarm_direction/
// alarm_threshold_pct/alarm_restore_pct added as retained identity fields,
// per docs/adr/0004 in hub -- see lib/tank-alarm.ts for how these replace
// the former hardcoded TANK_ALARM_CONFIGS mirror; level_pct_smoothed
// removed per docs/adr/0005 in hub -- TankCard shows raw level_pct;
// fill_rate_lpm/drain_rate_lpm removed per docs/adr/0006 in hub -- never
// consumed here, superseded by volume_since_full_l/volume_since_empty_l).
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
  /** Raw sender reading. Alarms/thresholds, `tank-alarm.ts`'s liquid-color
   * banding, and TankCard's displayed fill height/%/liters all key off
   * this — the driver-facing number is the sender's actual reading. */
  level_pct: number
  status: TankStatus
  /** Net liters moved since the last committed full latch. */
  volume_since_full_l: number
  /** Net liters moved since the last committed empty latch. */
  volume_since_empty_l: number
  /** Degrees Celsius. Optional — only present if an NTC temperature sensor is configured for this tank. */
  temperature_c?: number
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
    tank.status !== undefined &&
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

/**
 * GPS position fix per hub/schema/gps.schema.json. `fix_quality`/
 * `satellites_in_use`/`avg_snr_db` are unconditional (the latter absent
 * only before the node's first GSV sentence); every position/motion
 * field is present only once fix_quality !== 'no_fix' — see
 * `isCompleteGps` for the render-readiness check and `hasGpsFix` for
 * the separate "is there actually a position to plot" check.
 */
export type GpsFixQuality =
  'no_fix' | 'gps' | 'dgps' | 'pps' | 'rtk' | 'float_rtk' | 'estimated' | 'manual' | 'simulation'

export interface Gps {
  fix_quality: GpsFixQuality
  satellites_in_use: number
  /** Mean C/N0 (dB-Hz) across tracked satellites; independent of
   * fix_quality. Absent only before the first GSV sentence is decoded. */
  avg_snr_db?: number
  latitude?: number
  longitude?: number
  altitude_m?: number
  hdop?: number
  speed_kmh?: number
  course_deg?: number
  /** ISO-8601 UTC timestamp of the fix, explicit +00:00 offset. */
  fix_time?: string
}

/** Same partial-accumulation caveat as {@link isCompleteTank} — but
 * unlike Tank, "complete" here only means the two truly unconditional
 * fields have arrived, not that a position exists yet (no_fix is a
 * valid, fully-formed state with every other field absent). */
export function isCompleteGps(gps: Partial<Gps>): gps is Gps {
  return gps.fix_quality !== undefined && gps.satellites_in_use !== undefined
}

/** True once a Gps record actually has a plottable position — separate
 * from isCompleteGps because 'no_fix' is itself a complete, valid state
 * with no coordinates. */
export function hasGpsFix(gps: Gps): boolean {
  return gps.fix_quality !== 'no_fix' && gps.latitude !== undefined && gps.longitude !== undefined
}

export type TemperatureUnit = 'C' | 'F'
export type TemperatureStatus = 'ok' | 'no_reading' | 'disconnected'

/**
 * Temperature sensor per hub/schema/temperature.schema.json (1-Wire
 * DS18B20 probes + the Pi CPU, read by renewvan/node-temperature).
 * `temperature_c` is ALWAYS Celsius on the wire; `unit` is only the
 * user's display preference, applied by lib/temperature.ts. While
 * `status` is not 'ok' the node stops republishing `temperature_c` but
 * the LAST retained value stays on the broker, so a reading must only
 * be shown when `status === 'ok'` (see {@link temperatureReading}).
 * Same partial-accumulation caveat as {@link isCompleteTank}.
 */
export interface TemperatureSensor {
  name: string
  unit: TemperatureUnit
  source: 'w1' | 'cpu'
  /** 1-Wire id; present only when source is 'w1'. */
  serial?: string
  temperature_c?: number
  status: TemperatureStatus
}

export type TiltStatus = 'ok' | 'sensor_error'

/**
 * Van inclination per hub/schema/tilt.schema.json (read by
 * renewvan/node-tilt). Angles are in the van frame, already level-zeroed
 * by the node: `roll_deg` positive = left side down, `pitch_deg` positive
 * = nose up. While `status` is 'sensor_error' the node stops republishing
 * angles but the LAST retained values stay on the broker, so an angle must
 * only be shown when `status === 'ok'`. Same partial-accumulation caveat
 * as {@link isCompleteTank}.
 */
export interface Tilt {
  roll_deg: number
  pitch_deg: number
  status: TiltStatus
}

export interface Relay {
  state: boolean
}

export type NetworkType = '2g' | '3g' | 'lte' | 'nr' | 'unknown'

/**
 * Router entity per hub/schema/router.schema.json (the cellular uplink).
 * Same partial-accumulation caveat as {@link Tank}: between the first and
 * last retained message for an id, records in `RenewvanBusState.routers`
 * are `Partial<Router>` — but deliberately NO isCompleteRouter guard:
 * consumers degrade (the header connection icon renders checking/— for
 * missing fields rather than crashing or hiding).
 */
export interface Router {
  signal_rsrp_dbm: number
  signal_rsrq_db: number
  signal_sinr_db: number
  signal_rssi_dbm: number
  /** Raw PLMN string (e.g. '26203'); carrier-name mapping is presentation, elsewhere. */
  operator: string
  network_type: NetworkType
  uptime_s: number
  data_used_month_tx_b: number
  data_used_month_rx_b: number
}

/** Live state of the renewvan bus, keyed by entity id within each domain. */
export interface RenewvanBusState {
  tanks: Record<string, Tank>
  batteries: Record<string, Battery>
  relays: Record<string, Relay>
  routers: Record<string, Router>
  gps: Record<string, Gps>
  temperatures: Record<string, TemperatureSensor>
  tilt: Record<string, Tilt>
  /** Epoch ms of the newest router property per id — feeds the connection
   * icon's staleness rule (health offline OR older than 180 s = offline;
   * see lib/connection.ts). */
  routerUpdatedAt: Record<string, number>
}

export const emptyRenewvanBusState: RenewvanBusState = {
  tanks: {},
  batteries: {},
  relays: {},
  routers: {},
  gps: {},
  temperatures: {},
  tilt: {},
  routerUpdatedAt: {},
}
