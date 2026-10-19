import { act, renderHook, waitFor } from '@testing-library/react'
import type { MqttClient } from 'mqtt'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vite-plus/test'
import { useRenewvanBus } from './useRenewvanBus'

type Handler = (...args: unknown[]) => void

interface FakeClient {
  handlers: Map<string, Handler>
  subscribe: Mock
  publish: Mock
  end: Mock
}

// One entry per `mqtt.connect`: demo mode is a shared bus flag now, so a toggle must NOT make a new one.
const clients: FakeClient[] = []

vi.mock('mqtt', () => ({
  default: {
    connect: (): MqttClient => {
      const client: FakeClient = {
        handlers: new Map(),
        subscribe: vi.fn(),
        publish: vi.fn(),
        end: vi.fn(),
      }
      const api = {
        on: (event: string, handler: Handler) => {
          client.handlers.set(event, handler)
        },
        subscribe: client.subscribe,
        publish: client.publish,
        end: client.end,
      }
      clients.push(client)
      queueMicrotask(() => client.handlers.get('connect')?.())
      return api as unknown as MqttClient
    },
  },
}))

const latest = () => clients[clients.length - 1]

function send(client: FakeClient, topic: string, payload: string) {
  act(() => {
    client.handlers.get('message')?.(topic, { toString: () => payload })
  })
}

beforeEach(() => {
  clients.length = 0
  vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
})

async function renderBus() {
  const hook = renderHook(() => useRenewvanBus())
  await waitFor(() => expect(latest().subscribe).toHaveBeenCalled())
  return hook
}

describe('shared demo mode flag', () => {
  it('shows the real van until the bus says demo mode is on', async () => {
    const { result } = await renderBus()
    expect(result.current.demoMode).toBe(false)
    send(latest(), 'renewvan/battery/y/soc_pct', '12')
    send(latest(), 'renewvan/demo/battery/x/soc_pct', '78')
    await waitFor(() => expect(result.current.state.batteries).toEqual({ y: { soc_pct: 12 } }))
  })

  it('follows renewvan/demo/enabled: on shows only the demo van, off only the real one', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/battery/y/soc_pct', '12')
    send(latest(), 'renewvan/demo/battery/x/soc_pct', '78')

    send(latest(), 'renewvan/demo/enabled', 'true')
    await waitFor(() => expect(result.current.demoMode).toBe(true))
    expect(result.current.state.batteries).toEqual({ x: { soc_pct: 78 } })

    send(latest(), 'renewvan/demo/enabled', 'false')
    await waitFor(() => expect(result.current.demoMode).toBe(false))
    expect(result.current.state.batteries).toEqual({ y: { soc_pct: 12 } })
  })

  it('switches view without reconnecting, so a toggle in another client is instant', async () => {
    await renderBus()
    send(latest(), 'renewvan/demo/enabled', 'true')
    send(latest(), 'renewvan/demo/enabled', 'false')
    expect(clients).toHaveLength(1)
    expect(latest().end).not.toHaveBeenCalled()
  })

  it('keeps each root separate, so real values never leak into demo or back', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/battery/same/soc_pct', '12')
    send(latest(), 'renewvan/demo/battery/same/soc_pct', '78')
    send(latest(), 'renewvan/demo/enabled', 'true')
    await waitFor(() => expect(result.current.state.batteries.same.soc_pct).toBe(78))
    send(latest(), 'renewvan/demo/enabled', 'false')
    await waitFor(() => expect(result.current.state.batteries.same.soc_pct).toBe(12))
  })

  it('drops a demo value when node-demo clears its retained topic', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/demo/enabled', 'true')
    send(latest(), 'renewvan/demo/battery/x/soc_pct', '78')
    await waitFor(() => expect(result.current.state.batteries).toEqual({ x: { soc_pct: 78 } }))
    // node-demo removes a retained topic with an empty payload (ADR 0008).
    send(latest(), 'renewvan/demo/battery/x/soc_pct', '')
    await waitFor(() => expect(result.current.state.batteries.x?.soc_pct).toBeUndefined())
  })

  it('ignores anything that is not a JSON boolean on the enabled topic', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/demo/enabled', 'true')
    await waitFor(() => expect(result.current.demoMode).toBe(true))
    for (const bad of ['', 'on', '"true"', 'null', '1']) {
      send(latest(), 'renewvan/demo/enabled', bad)
    }
    expect(result.current.demoMode).toBe(true)
  })

  it('takes router health from the active root only', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/router/health', 'online')
    send(latest(), 'renewvan/demo/router/health', 'offline')
    await waitFor(() => expect(result.current.routerHealth).toBe('online'))
    send(latest(), 'renewvan/demo/enabled', 'true')
    await waitFor(() => expect(result.current.routerHealth).toBe('offline'))
  })

  it('reads the demo router Node health through the registry, and an empty payload as no health', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/router/health', 'online')
    send(latest(), 'renewvan/demo/enabled', 'true')
    send(latest(), 'renewvan/demo/router/health', 'offline')
    await waitFor(() => expect(result.current.state.nodes.router?.health).toBe('offline'))
    expect(result.current.routerHealth).toBe('offline')
    // node-demo clears its retained topic (ADR 0008); the real root's 'online' must not show through.
    send(latest(), 'renewvan/demo/router/health', '')
    await waitFor(() => expect(result.current.state.nodes.router).toBeUndefined())
    expect(result.current.routerHealth).toBeNull()
  })

  it('subscribes once to renewvan/#, which already covers the demo namespace', async () => {
    await renderBus()
    // A second `renewvan/demo/#` subscription would make the broker deliver every demo message twice.
    expect(latest().subscribe).toHaveBeenCalledTimes(1)
    expect(latest().subscribe).toHaveBeenCalledWith('renewvan/#')
  })

  it('applies each demo message exactly once', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/demo/enabled', 'true')
    send(latest(), 'renewvan/demo/router/main/uptime_s', '10')
    await waitFor(() => expect(result.current.state.routerUpdatedAt.main).toBeTypeOf('number'))
    expect(Object.keys(result.current.state.routers)).toEqual(['main'])
  })

  it('never reads a demo entity as a real one: demo/ is not a domain', async () => {
    const { result } = await renderBus()
    // `demo` sits where a domain would, so the real pattern must reject every shape it produces.
    send(latest(), 'renewvan/demo/battery/house/soc_pct', '78')
    send(latest(), 'renewvan/demo/router/health', 'online')
    send(latest(), 'renewvan/demo/enabled/set', 'true')
    await waitFor(() => expect(result.current.demoMode).toBe(false))
    expect(result.current.state.batteries).toEqual({})
    expect(result.current.routerHealth).toBeNull()
  })

  it('keeps the kiosk and tailscale topics on the real root in demo mode', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/demo/enabled', 'true')
    send(latest(), 'renewvan/kiosk/display/brightness', '40')
    send(latest(), 'renewvan/tailscale/status', JSON.stringify({ enabled: true, peers: 2 }))
    await waitFor(() => expect(result.current.brightness).toBe(40))
    expect(result.current.tailscale?.peers).toBe(2)
  })

  it('keeps each root own Nodes separate, so a real Node never shows in demo or back', async () => {
    const { result } = await renderBus()
    const info = (version: string) =>
      JSON.stringify({ node: 'tank', product: 'Tank node', source: 'ADS1115', version })
    send(latest(), 'renewvan/tank/info', info('v0.8.0'))
    send(latest(), 'renewvan/tank/health', 'online')
    send(latest(), 'renewvan/demo/tank/info', info('v9.9.9-demo'))
    send(latest(), 'renewvan/demo/venus/health', 'offline')

    await waitFor(() => expect(result.current.state.nodes.tank?.info?.version).toBe('v0.8.0'))
    expect(Object.keys(result.current.state.nodes)).toEqual(['tank'])

    send(latest(), 'renewvan/demo/enabled', 'true')
    await waitFor(() => expect(result.current.demoMode).toBe(true))
    expect(result.current.state.nodes).toEqual({
      tank: { info: expect.objectContaining({ version: 'v9.9.9-demo' }) },
      venus: { health: 'offline' },
    })

    send(latest(), 'renewvan/demo/enabled', 'false')
    await waitFor(() => expect(result.current.demoMode).toBe(false))
    expect(result.current.state.nodes.tank?.info?.version).toBe('v0.8.0')
    expect(result.current.state.nodes.venus).toBeUndefined()
  })

  it('drops every demo Node when node-demo clears its retained topics', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/demo/enabled', 'true')
    send(latest(), 'renewvan/demo/venus/health', 'online')
    await waitFor(() => expect(result.current.state.nodes.venus?.health).toBe('online'))
    send(latest(), 'renewvan/demo/venus/health', '')
    await waitFor(() => expect(result.current.state.nodes).toEqual({}))
  })
})

describe('setDemoMode', () => {
  it('publishes the retained-state command on renewvan/demo/enabled/set as a JSON boolean', async () => {
    const { result } = await renderBus()
    act(() => result.current.setDemoMode(true))
    expect(latest().publish).toHaveBeenCalledWith('renewvan/demo/enabled/set', 'true', {
      qos: 1,
      retain: false,
    })
    act(() => result.current.setDemoMode(false))
    expect(latest().publish).toHaveBeenLastCalledWith('renewvan/demo/enabled/set', 'false', {
      qos: 1,
      retain: false,
    })
  })

  it('does not flip the view itself: the shared flag from the bus is the only source of truth', async () => {
    const { result } = await renderBus()
    act(() => result.current.setDemoMode(true))
    expect(result.current.demoMode).toBe(false)
    send(latest(), 'renewvan/demo/enabled', 'true')
    await waitFor(() => expect(result.current.demoMode).toBe(true))
  })
})

describe('publish while in demo mode', () => {
  it('sends nothing but kiosk commands and the demo switch', async () => {
    const { result } = await renderBus()
    send(latest(), 'renewvan/demo/enabled', 'true')
    await waitFor(() => expect(result.current.demoMode).toBe(true))
    act(() => result.current.publish('renewvan/temperature/indoor/name/set', '"x"'))
    act(() => result.current.publish('renewvan/kiosk/display/brightness/set', '50'))
    const sent = latest().publish.mock.calls.map((c) => c[0])
    expect(sent).toEqual(['renewvan/kiosk/display/brightness/set'])
  })

  it('publishes any topic while demo mode is off', async () => {
    const { result } = await renderBus()
    act(() => result.current.publish('renewvan/temperature/indoor/name/set', '"x"'))
    expect(latest().publish).toHaveBeenCalledTimes(1)
  })
})
