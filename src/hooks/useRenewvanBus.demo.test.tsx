import { act, renderHook, waitFor } from '@testing-library/react'
import type { MqttClient } from 'mqtt'
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { useRenewvanBus } from './useRenewvanBus'

type Handler = (...args: unknown[]) => void

interface FakeClient {
  handlers: Map<string, Handler>
  subscribe: Mock
  publish: Mock
  end: Mock
}

// One entry per `mqtt.connect`, so a test can see the client a flip tore down and the one it made.
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

async function renderBus(demo: boolean) {
  const hook = renderHook(({ demo: flag }) => useRenewvanBus({ demo: flag }), {
    initialProps: { demo },
  })
  await waitFor(() => expect(latest().subscribe).toHaveBeenCalled())
  return hook
}

describe('useRenewvanBus demo flag', () => {
  it('reads entities from renewvan-demo/ and ignores the real root while on', async () => {
    const { result } = await renderBus(true)
    send(latest(), 'renewvan-demo/battery/x/soc_pct', '78')
    send(latest(), 'renewvan/battery/y/soc_pct', '12')
    await waitFor(() => expect(result.current.state.batteries).toEqual({ x: { soc_pct: 78 } }))
  })

  it('reads entities from renewvan/ and ignores the demo root while off', async () => {
    const { result } = await renderBus(false)
    send(latest(), 'renewvan/battery/y/soc_pct', '12')
    send(latest(), 'renewvan-demo/battery/x/soc_pct', '78')
    await waitFor(() => expect(result.current.state.batteries).toEqual({ y: { soc_pct: 12 } }))
  })

  it('takes router health from the demo root only while on', async () => {
    const { result } = await renderBus(true)
    send(latest(), 'renewvan/router/health', 'online')
    expect(result.current.routerHealth).toBeNull()
    send(latest(), 'renewvan-demo/router/health', 'offline')
    await waitFor(() => expect(result.current.routerHealth).toBe('offline'))
  })

  it('subscribes to the demo root plus only the real host plugins while on', async () => {
    await renderBus(true)
    expect(latest().subscribe).toHaveBeenCalledWith([
      'renewvan-demo/#',
      'renewvan/kiosk/#',
      'renewvan/tailscale/status',
    ])
  })

  it('subscribes to the whole real root while off', async () => {
    await renderBus(false)
    expect(latest().subscribe).toHaveBeenCalledWith('renewvan/#')
  })

  it.each([
    [false, true],
    [true, false],
  ])(
    'flipping demo %s -> %s drops the client and every accumulated value, then re-subscribes',
    async (from, to) => {
      const { result, rerender } = await renderBus(from)
      const first = latest()
      const root = from ? 'renewvan-demo' : 'renewvan'
      send(first, `${root}/battery/x/soc_pct`, '78')
      send(first, `${root}/router/health`, 'online')
      send(first, 'renewvan/kiosk/display/power', 'on')
      send(first, 'renewvan/kiosk/display/brightness', '70')
      send(first, 'renewvan/kiosk/display/auto-sleep-enabled', 'true')
      send(first, 'renewvan/kiosk/display/auto-sleep-timeout-minutes', '5')
      send(first, 'renewvan/tailscale/status', '{"enabled":true,"connected":true,"peers":1}')
      await waitFor(() => expect(result.current.state.batteries.x).toBeDefined())

      rerender({ demo: to })

      expect(first.end).toHaveBeenCalled()
      expect(clients).toHaveLength(2)
      expect(result.current.state.batteries).toEqual({})
      expect(result.current.routerHealth).toBeNull()
      expect(result.current.displayPower).toBeNull()
      expect(result.current.brightness).toBeNull()
      expect(result.current.autoSleepEnabled).toBeNull()
      expect(result.current.autoSleepTimeoutMinutes).toBeNull()
      expect(result.current.tailscale).toBeNull()
      await waitFor(() => expect(latest().subscribe).toHaveBeenCalled())
      expect(latest().subscribe).toHaveBeenCalledWith(
        to ? expect.arrayContaining(['renewvan-demo/#']) : 'renewvan/#',
      )

      // The torn-down client's late messages and `close` must not repopulate or flip the status.
      send(first, `${root}/battery/x/soc_pct`, '99')
      act(() => first.handlers.get('close')?.())
      expect(result.current.state.batteries).toEqual({})
      await waitFor(() => expect(result.current.status).toBe('connected'))
    },
  )

  it('keeps the kiosk and tailscale topics on the real root in demo mode', async () => {
    const { result } = await renderBus(true)
    send(latest(), 'renewvan/kiosk/display/power', 'off')
    send(latest(), 'renewvan/kiosk/display/brightness', '40')
    send(latest(), 'renewvan/kiosk/display/auto-sleep-enabled', 'true')
    send(latest(), 'renewvan/kiosk/display/auto-sleep-timeout-minutes', '15')
    send(latest(), 'renewvan/tailscale/status', '{"enabled":true,"connected":true,"peers":2}')
    send(latest(), 'renewvan-demo/kiosk/display/brightness', '99')
    await waitFor(() => expect(result.current.displayPower).toBe('off'))
    expect(result.current.brightness).toBe(40)
    expect(result.current.autoSleepEnabled).toBe(true)
    expect(result.current.autoSleepTimeoutMinutes).toBe(15)
    expect(result.current.tailscale).toMatchObject({ connected: true, peers: 2 })
  })

  it('publishes nothing but kiosk commands while on', async () => {
    const { result } = await renderBus(true)
    result.current.publish('renewvan/temperature/outdoor/name/set', '"Garage"')
    result.current.publish('renewvan-demo/temperature/outdoor/name/set', '"Garage"')
    expect(latest().publish).not.toHaveBeenCalled()
    result.current.publish('renewvan/kiosk/display/brightness/set', '50')
    expect(latest().publish).toHaveBeenCalledWith('renewvan/kiosk/display/brightness/set', '50', {
      qos: 1,
      retain: false,
    })
  })

  it('publishes any topic while off', async () => {
    const { result } = await renderBus(false)
    result.current.publish('renewvan/temperature/outdoor/name/set', '"Garage"')
    expect(latest().publish).toHaveBeenCalledWith(
      'renewvan/temperature/outdoor/name/set',
      '"Garage"',
      { qos: 1, retain: false },
    )
  })
})
