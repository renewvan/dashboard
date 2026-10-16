import { describe, expect, it } from 'vite-plus/test'
import type { Battery, Charger, Solar } from '@/types'
import { buildFlow, flowFromBus, IDLE_W, type FlowEdge, type NodeId } from './flowModel'

const battery = (soc: number, powerW: number): Battery => ({
  soc_pct: soc,
  voltage_v: 13.2,
  current_a: Math.round((powerW / 13.2) * 10) / 10,
  power_w: powerW,
})

const solar = (powerW: number): Solar => ({ power_w: powerW, battery_voltage_v: 13.4 })

const charger = (source: 'alternator' | 'ac', powerW: number): Charger => ({
  voltage_v: 13.8,
  power_w: powerW,
  source,
})

const edge = (edges: FlowEdge[], from: NodeId, to: NodeId): number =>
  edges.find((e) => e.from === from && e.to === to)?.watts ?? NaN

describe('buildFlow without an inverter', () => {
  it('derives the loads as everything in minus what the battery absorbed', () => {
    const flow = buildFlow({
      battery: battery(83, 950),
      solar: solar(1850),
      alternator: undefined,
      shore: undefined,
    })

    expect(flow.nodes.loads.watts).toBe(900)
    expect(edge(flow.edges, 'battery', 'loads')).toBe(900)
  })

  it('reads a discharging battery as loads drawn from it, not as negative input', () => {
    const flow = buildFlow({
      battery: battery(61, -185),
      solar: solar(0),
      alternator: undefined,
      shore: undefined,
    })

    expect(flow.batteryState).toBe('discharging')
    expect(flow.nodes.loads.watts).toBe(185)
  })

  it('never reports negative loads when the battery absorbs more than the sources supply', () => {
    // A shunt and a charger sampled a moment apart can disagree; loads must clamp at zero.
    const flow = buildFlow({
      battery: battery(50, 500),
      solar: solar(100),
      alternator: undefined,
      shore: undefined,
    })

    expect(flow.nodes.loads.watts).toBe(0)
  })

  it('treats shunt jitter around zero as idle, not as charging or discharging', () => {
    const calm = (w: number) =>
      buildFlow({
        battery: battery(100, w),
        solar: undefined,
        alternator: undefined,
        shore: undefined,
      }).batteryState

    expect(calm(IDLE_W)).toBe('idle')
    expect(calm(-IDLE_W)).toBe('idle')
    expect(calm(IDLE_W + 1)).toBe('charging')
    expect(calm(-IDLE_W - 1)).toBe('discharging')
  })

  it('marks nothing present until the battery has published its core measurements', () => {
    const flow = flowFromBus({ house: { soc_pct: 80 } }, {}, {})

    expect(flow.nodes.battery.present).toBe(false)
    expect(flow.nodes.loads.present).toBe(false)
  })
})

describe('buildFlow with an inverter', () => {
  it('splits the load: AC through the inverter, DC straight off the battery, and the battery balances', () => {
    // solar 1850 - inverted AC 900 - DC 250 = +700 W into the battery.
    const flow = buildFlow({
      battery: battery(81, 700),
      solar: solar(1850),
      alternator: undefined,
      shore: undefined,
      inverter: { state: 'inverting', acOutW: 900 },
      dcLoadsW: 250,
    })

    expect(flow.nodes.loads.present).toBe(false)
    expect(flow.nodes.acLoads.watts).toBe(900)
    expect(flow.nodes.dcLoads.watts).toBe(250)
    expect(edge(flow.edges, 'battery', 'inverter')).toBe(900)
    expect(edge(flow.edges, 'inverter', 'battery')).toBe(0)
  })

  it('serves the AC loads from shore first and charges the battery with what is left', () => {
    // Shore 1500 W, AC loads 400 W: 1100 W is left for the charger.
    const flow = buildFlow({
      battery: battery(64, 1310),
      solar: solar(300),
      alternator: undefined,
      shore: charger('ac', 1500),
      inverter: { state: 'charging', acOutW: 400 },
      dcLoadsW: 90,
    })

    expect(edge(flow.edges, 'shore', 'inverter')).toBe(1500)
    expect(edge(flow.edges, 'inverter', 'battery')).toBe(1100)
    expect(edge(flow.edges, 'battery', 'inverter')).toBe(0)
  })

  it('inverts only the part of the AC load that shore cannot cover', () => {
    const flow = buildFlow({
      battery: battery(70, -500),
      solar: undefined,
      alternator: undefined,
      shore: charger('ac', 300),
      inverter: { state: 'inverting', acOutW: 800 },
      dcLoadsW: 0,
    })

    expect(edge(flow.edges, 'battery', 'inverter')).toBe(500)
    expect(edge(flow.edges, 'inverter', 'battery')).toBe(0)
  })

  it('falls back to the single derived Loads node when the inverter has not published', () => {
    const flow = buildFlow({
      battery: battery(83, 950),
      solar: solar(1850),
      alternator: undefined,
      shore: undefined,
      inverter: undefined,
      dcLoadsW: 250,
    })

    expect(flow.nodes.loads.present).toBe(true)
    expect(flow.nodes.acLoads.present).toBe(false)
    expect(flow.nodes.dcLoads.present).toBe(false)
  })
})
