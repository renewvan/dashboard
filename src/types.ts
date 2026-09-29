// v0.1 device-model entity shapes, per hub/schema/*.schema.json.
// Each entity is keyed by `id` (the topic's path segment, never a payload
// field) — see hub/CONTEXT.md's Entity/topic-convention terms.

export type FluidType = 'fresh_water' | 'grey_water' | 'black_water' | 'fuel' | 'lpg'
export type TankStatus = 'ok' | 'open_circuit' | 'short_circuit'
/** Hub-computed alarm state, per hub/schema/tank.schema.json; direction
 * (low/high) is implicit in per-tank hub config, not exposed here. Optional
 * on the wire — tanks without alarm config configured never publish it. */
export type TankAlarmState = 'ok' | 'alarm'

export interface Tank {
  fluid_type: FluidType
  capacity_l: number
  level_pct: number
  status: TankStatus
  alarm_state?: TankAlarmState
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
    tank.status !== undefined
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
