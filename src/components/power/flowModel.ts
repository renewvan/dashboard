// The Power page's model: the van's power at one instant, as nodes and the flows between them.
// Both layouts (Tiles and Flow) draw this one snapshot, so they always show the same numbers.
//
// The bus carries solar, battery and charger (alternator / shore) entities. It does NOT yet carry
// an inverter/charger or separate AC / DC load readings (node-venus maps none of Venus's vebus or
// system/0/Ac|Dc paths), so `inverter` and `dcLoadsW` are optional INPUTS: absent, the page shows
// one derived "Loads" node (the battery's signed power_w, as the Start page's right half-moon
// does); present, it splits into inverter -> AC loads and battery -> DC loads.

import { chargerWatts } from '@/lib/charging'
import { firstSolar } from '@/components/widgets/solar/solarView'
import { isCompleteBattery, type Battery, type Charger, type Solar } from '@/types'

export type NodeId =
  | 'solar'
  | 'alternator'
  | 'shore'
  | 'inverter'
  | 'battery'
  | 'loads'
  | 'acLoads'
  | 'dcLoads'

export interface FlowNode {
  id: NodeId
  label: string
  /** Whole watts, signed for the battery (+ charging, - discharging); undefined = not published. */
  watts: number | undefined
  /** Whether the van has this source at all (an absent alternator/shore is not drawn). */
  present: boolean
  sub?: string
}

export interface FlowEdge {
  from: NodeId
  to: NodeId
  /** Watts moving along the edge, always >= 0 in the from -> to direction. 0 = idle. */
  watts: number
}

export interface PowerSnapshot {
  nodes: Record<NodeId, FlowNode>
  edges: FlowEdge[]
  soc: number | undefined
  batteryState: 'charging' | 'discharging' | 'idle' | 'unknown'
  /** Largest edge in watts: the scale for flow speed and pulse rate. */
  peakW: number
  /** Seconds until empty at the present discharge rate, when the battery publishes an estimate. */
  timeToGoS: number | undefined
  voltage: number | undefined
  current: number | undefined
}

export interface InverterInput {
  /** Inverter/charger mode, shown on its tile (Venus `vebus` state). */
  state: 'inverting' | 'charging' | 'passthru' | 'off'
  /** AC watts delivered to the AC loads. */
  acOutW: number
}

export interface FlowInput {
  battery: Partial<Battery> | undefined
  solar: Solar | undefined
  alternator: Charger | undefined
  shore: Charger | undefined
  /** Absent on a van with no inverter/charger: the page keeps one derived Loads node. */
  inverter?: InverterInput
  /** DC loads in watts; only meaningful alongside an inverter (otherwise all load is "Loads"). */
  dcLoadsW?: number
}

/** Below this the link is drawn idle: shunts jitter around zero and would flicker the particles. */
export const IDLE_W = 5

/**
 * Seconds one dash/bead takes to travel its link, shared by every variant so the speed reads the
 * same everywhere. Slow on purpose: 6 s at a trickle down to 2.5 s at the busiest link. (The first
 * cut ran 0.6-2.4 s, which flickered rather than flowed.)
 */
export function flowSeconds(watts: number, peakW: number): number {
  return 6 - 3.5 * Math.min(1, watts / peakW)
}

/** Seconds the battery band rests between two passes, so the next one does not follow at once. */
export const PULSE_PAUSE_S = 2

/**
 * Seconds one charging pulse takes on a battery fill: 3.2 s at a trickle down to 1.6 s at the
 * busiest link. Shared so A's tile and B's orb breathe at the same rate for the same charge.
 */
export function pulseSeconds(watts: number, peakW: number): number {
  return 3.2 - 1.6 * Math.min(1, Math.max(0, watts / peakW))
}

export function buildFlow({
  battery,
  solar,
  alternator,
  shore,
  inverter,
  dcLoadsW,
}: FlowInput): PowerSnapshot {
  const b = battery && isCompleteBattery(battery) ? battery : undefined
  const solarW = solar ? Math.max(0, solar.power_w) : undefined
  const altW = alternator ? (chargerWatts(alternator) ?? 0) : undefined
  const shoreW = shore ? (chargerWatts(shore) ?? 0) : undefined
  const batteryW = b?.power_w

  const inW = (solarW ?? 0) + (altW ?? 0) + (shoreW ?? 0)
  // Everything leaving the system = in - what the battery absorbed (battery W is + while charging).
  const loadsW = b ? Math.max(0, inW - batteryW!) : undefined

  const edges: FlowEdge[] = []
  let acLoadsW: number | undefined
  let dcOutW: number | undefined
  let inverterW: number | undefined

  if (inverter && b) {
    // Split: DC loads straight off the battery bus, AC loads through the inverter. Whatever the
    // inverter draws from the DC side is its AC output (efficiency loss ignored in the mock).
    dcOutW = Math.max(0, dcLoadsW ?? 0)
    acLoadsW = Math.max(0, inverter.acOutW)
    // Shore feeds the inverter/charger's AC input, not the battery directly.
    const acInW = shoreW ?? 0
    // AC loads are served by shore first; the rest is inverted from the battery.
    const invertedW = Math.max(0, acLoadsW - acInW)
    // Shore left over after the AC loads charges the battery through the charger.
    const chargeFromAcW = Math.max(0, acInW - acLoadsW)
    inverterW = acLoadsW
    edges.push(
      { from: 'solar', to: 'battery', watts: solarW ?? 0 },
      { from: 'alternator', to: 'battery', watts: altW ?? 0 },
      { from: 'shore', to: 'inverter', watts: acInW },
      { from: 'inverter', to: 'battery', watts: chargeFromAcW },
      { from: 'battery', to: 'inverter', watts: invertedW },
      { from: 'inverter', to: 'acLoads', watts: acLoadsW },
      { from: 'battery', to: 'dcLoads', watts: dcOutW },
    )
  } else {
    edges.push(
      { from: 'solar', to: 'battery', watts: solarW ?? 0 },
      { from: 'alternator', to: 'battery', watts: altW ?? 0 },
      { from: 'shore', to: 'battery', watts: shoreW ?? 0 },
      { from: 'battery', to: 'loads', watts: loadsW ?? 0 },
    )
  }

  let batteryState: PowerSnapshot['batteryState'] = 'unknown'
  if (b) {
    batteryState = batteryW! > IDLE_W ? 'charging' : batteryW! < -IDLE_W ? 'discharging' : 'idle'
  }

  return {
    nodes: {
      solar: {
        id: 'solar',
        label: 'Solar',
        watts: solarW === undefined ? undefined : Math.round(solarW),
        present: solar !== undefined,
        sub:
          solar?.yield_today_wh === undefined
            ? undefined
            : `${(solar.yield_today_wh / 1000).toFixed(1)} kWh today`,
      },
      alternator: {
        id: 'alternator',
        label: 'Alternator',
        watts: altW === undefined ? undefined : Math.round(altW),
        present: alternator !== undefined,
      },
      shore: {
        id: 'shore',
        label: 'Shore',
        watts: shoreW === undefined ? undefined : Math.round(shoreW),
        present: shore !== undefined,
      },
      inverter: {
        id: 'inverter',
        label: 'Inverter / Charger',
        watts: inverterW === undefined ? undefined : Math.round(inverterW),
        present: inverter !== undefined && b !== undefined,
        sub: inverter?.state,
      },
      battery: {
        id: 'battery',
        label: 'Battery',
        watts: batteryW === undefined ? undefined : Math.round(batteryW),
        present: b !== undefined,
      },
      loads: {
        id: 'loads',
        label: 'Loads',
        watts: loadsW === undefined ? undefined : Math.round(loadsW),
        present: b !== undefined && inverter === undefined,
      },
      acLoads: {
        id: 'acLoads',
        label: 'AC loads',
        watts: acLoadsW === undefined ? undefined : Math.round(acLoadsW),
        present: acLoadsW !== undefined,
      },
      dcLoads: {
        id: 'dcLoads',
        label: 'DC loads',
        watts: dcOutW === undefined ? undefined : Math.round(dcOutW),
        present: dcOutW !== undefined,
      },
    },
    edges,
    soc: b?.soc_pct,
    batteryState,
    peakW: Math.max(IDLE_W, ...edges.map((e) => e.watts)),
    timeToGoS: b?.time_to_go_s,
    voltage: b?.voltage_v,
    current: b?.current_a,
  }
}

/** First complete charger of a given source. */
function chargerOf(chargers: Record<string, Partial<Charger>>, source: Charger['source']) {
  return Object.values(chargers).find(
    (c): c is Charger => c.voltage_v !== undefined && c.source === source,
  )
}

export function flowFromBus(
  batteries: Record<string, Partial<Battery>>,
  solar: Record<string, Partial<Solar>>,
  chargers: Record<string, Partial<Charger>>,
): PowerSnapshot {
  return buildFlow({
    battery: Object.values(batteries).find(isCompleteBattery),
    solar: firstSolar(solar),
    alternator: chargerOf(chargers, 'alternator'),
    shore: chargerOf(chargers, 'ac'),
  })
}

/** 1850 -> "1.85 kW", 640 -> "640 W": same unit switch the rest of the app uses for big readings. */
export function formatPower(w: number | undefined): { value: string; unit: string } {
  if (w === undefined) return { value: '—', unit: '' }
  const abs = Math.abs(w)
  if (abs >= 1000) return { value: (w / 1000).toFixed(2), unit: 'kW' }
  return { value: String(w), unit: 'W' }
}
