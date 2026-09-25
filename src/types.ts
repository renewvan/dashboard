// v0.1 device-model entity shapes, per hub/schema/*.schema.json.
// Each entity is keyed by `id` (the topic's path segment, never a payload
// field) — see hub/CONTEXT.md's Entity/topic-convention terms.

export type FluidType = 'fresh_water' | 'grey_water' | 'black_water' | 'fuel' | 'lpg'
export type TankStatus = 'ok' | 'open_circuit' | 'short_circuit'

export interface Tank {
  fluid_type: FluidType
  capacity_l: number
  level_pct: number
  status: TankStatus
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

export interface Relay {
  state: boolean
}

/** Live state of the van bus, keyed by entity id within each domain. */
export interface VanBusState {
  tanks: Record<string, Tank>
  batteries: Record<string, Battery>
  relays: Record<string, Relay>
}

export const emptyVanBusState: VanBusState = {
  tanks: {},
  batteries: {},
  relays: {},
}
