import { renderHook, waitFor } from '@testing-library/react'
import type { MqttClient } from 'mqtt'
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useRenewvanBus } from './useRenewvanBus'

type MessageHandler = (topic: string, message: { toString: () => string }) => void

const messageHandlers: MessageHandler[] = []
const connectMock = vi.fn()

vi.mock('mqtt', () => ({
  default: {
    connect: (url: string, _opts: unknown): MqttClient => {
      connectMock(url)
      const handlers = new Map<string, (...args: unknown[]) => void>()
      const client = {
        on: (event: string, handler: (...args: unknown[]) => void) => {
          handlers.set(event, handler)
          if (event === 'message') messageHandlers.push(handler as MessageHandler)
        },
        subscribe: vi.fn(),
        publish: vi.fn(),
        end: vi.fn(),
      }
      queueMicrotask(() => handlers.get('connect')?.())
      return client as unknown as MqttClient
    },
  },
}))

describe('useRenewvanBus router entity', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('starts with no routers, no health, and no receipt times', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    expect(result.current.state.routers).toEqual({})
    expect(result.current.routerHealth).toBeNull()
    expect(result.current.state.routerUpdatedAt).toEqual({})
  })

  it('accumulates router properties per id, JSON-scalars like other entities', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/router/main/signal_rsrp_dbm', { toString: () => '-85' })
    messageHandlers[0]('renewvan/router/main/operator', { toString: () => '"26203"' })
    messageHandlers[0]('renewvan/router/backup/network_type', { toString: () => '"lte"' })
    await waitFor(() =>
      expect(result.current.state.routers).toEqual({
        main: { signal_rsrp_dbm: -85, operator: '26203' },
        backup: { network_type: 'lte' },
      }),
    )
  })

  it('stamps the receipt time of the latest router property per id', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
    try {
      const { result } = renderHook(() => useRenewvanBus())
      await waitFor(() => expect(connectMock).toHaveBeenCalled())
      nowSpy.mockReturnValue(1_791_028_800_000) // 2026-10-03T12:00:00Z
      messageHandlers[0]('renewvan/router/main/signal_rsrp_dbm', { toString: () => '-85' })
      nowSpy.mockReturnValue(1_791_028_830_000) // 2026-10-03T12:00:30Z
      messageHandlers[0]('renewvan/router/main/operator', { toString: () => '"26203"' })
      await waitFor(() =>
        expect(result.current.state.routerUpdatedAt).toEqual({ main: 1_791_028_830_000 }),
      )
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("tracks the node's health from renewvan/router/health, ignoring unknown payloads", async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/router/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.routerHealth).toBe('online'))
    messageHandlers[0]('renewvan/router/health', { toString: () => 'offline' })
    await waitFor(() => expect(result.current.routerHealth).toBe('offline'))
    messageHandlers[0]('renewvan/router/health', { toString: () => 'rebooting' })
    await waitFor(() => expect(result.current.routerHealth).toBe('offline'))
  })

  it('drops the superseded renewvan/uplink/status topic entirely', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/uplink/status', {
      toString: () => '{"path":"wifi","online":true}',
    })
    await waitFor(() => expect(result.current.state.routers).toEqual({}))
    expect('uplink' in result.current).toBe(false)
  })
})

describe('useRenewvanBus display settings', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('starts all three display settings null until a message arrives', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(result.current.status).toBe('connected'))
    expect(result.current.brightness).toBeNull()
    expect(result.current.autoSleepEnabled).toBeNull()
    expect(result.current.autoSleepTimeoutMinutes).toBeNull()
  })

  it('parses auto-sleep-enabled as a boolean', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(messageHandlers.length).toBeGreaterThan(0))
    messageHandlers[0]('renewvan/kiosk/display/auto-sleep-enabled', { toString: () => 'true' })
    await waitFor(() => expect(result.current.autoSleepEnabled).toBe(true))
  })

  it('parses brightness as an integer within 0-100', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(messageHandlers.length).toBeGreaterThan(0))
    messageHandlers[0]('renewvan/kiosk/display/brightness', { toString: () => '70' })
    await waitFor(() => expect(result.current.brightness).toBe(70))
  })

  it('ignores an out-of-range brightness payload', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(messageHandlers.length).toBeGreaterThan(0))
    messageHandlers[0]('renewvan/kiosk/display/brightness', { toString: () => '150' })
    expect(result.current.brightness).toBeNull()
  })

  it('parses auto-sleep-timeout-minutes only when it is one of the preset choices', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(messageHandlers.length).toBeGreaterThan(0))
    messageHandlers[0]('renewvan/kiosk/display/auto-sleep-timeout-minutes', {
      toString: () => '15',
    })
    await waitFor(() => expect(result.current.autoSleepTimeoutMinutes).toBe(15))

    messageHandlers[0]('renewvan/kiosk/display/auto-sleep-timeout-minutes', { toString: () => '7' })
    expect(result.current.autoSleepTimeoutMinutes).toBe(15) // unchanged — 7 isn't a preset
  })
})

describe('useRenewvanBus temperature entity', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('accumulates identity and live fields per sensor id', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/temperature/outdoor/name', { toString: () => '"Outdoor"' })
    messageHandlers[0]('renewvan/temperature/outdoor/unit', { toString: () => '"F"' })
    messageHandlers[0]('renewvan/temperature/outdoor/temperature_c', { toString: () => '31.5' })
    messageHandlers[0]('renewvan/temperature/outdoor/status', { toString: () => '"ok"' })
    messageHandlers[0]('renewvan/temperature/cpu/source', { toString: () => '"cpu"' })
    await waitFor(() =>
      expect(result.current.state.temperatures).toEqual({
        outdoor: { name: 'Outdoor', unit: 'F', temperature_c: 31.5, status: 'ok' },
        cpu: { source: 'cpu' },
      }),
    )
  })

  it('ignores the node health topic and the <field>/set command topics', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/temperature/health', { toString: () => 'online' })
    messageHandlers[0]('renewvan/temperature/outdoor/unit/set', { toString: () => '"F"' })
    messageHandlers[0]('renewvan/temperature/outdoor/name/set', { toString: () => '"x"' })
    messageHandlers[0]('renewvan/temperature/outdoor/status', { toString: () => '"ok"' })
    await waitFor(() =>
      expect(result.current.state.temperatures).toEqual({ outdoor: { status: 'ok' } }),
    )
  })
})

describe('useRenewvanBus tilt entity', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('accumulates tilt properties per id as JSON scalars', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tilt/tilt/roll_deg', { toString: () => '0.73' })
    messageHandlers[0]('renewvan/tilt/tilt/pitch_deg', { toString: () => '-2.22' })
    messageHandlers[0]('renewvan/tilt/tilt/status', { toString: () => '"ok"' })
    await waitFor(() =>
      expect(result.current.state.tilt).toEqual({
        tilt: { roll_deg: 0.73, pitch_deg: -2.22, status: 'ok' },
      }),
    )
  })

  it('ignores the node liveness topic and the level_zero command topic', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tilt/health', { toString: () => 'online' })
    messageHandlers[0]('renewvan/tilt/tilt/level_zero/set', { toString: () => 'now' })
    messageHandlers[0]('renewvan/tilt/tilt/status', { toString: () => '"ok"' })
    await waitFor(() => expect(result.current.state.tilt).toEqual({ tilt: { status: 'ok' } }))
  })
})

describe('useRenewvanBus solar entity', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('accumulates solar properties per controller id, strings unquoted', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/solar/291/power_w', { toString: () => '412' })
    messageHandlers[0]('renewvan/solar/291/battery_voltage_v', { toString: () => '13.44' })
    messageHandlers[0]('renewvan/solar/291/yield_today_wh', { toString: () => '2140' })
    messageHandlers[0]('renewvan/solar/291/charge_state', { toString: () => '"bulk"' })
    await waitFor(() =>
      expect(result.current.state.solar).toEqual({
        '291': {
          power_w: 412,
          battery_voltage_v: 13.44,
          yield_today_wh: 2140,
          charge_state: 'bulk',
        },
      }),
    )
  })

  it('keeps yield_history_wh as an array, newest first, with null slots left as null', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/solar/291/yield_history_wh', {
      toString: () => '[210,1840,null,0]',
    })
    await waitFor(() =>
      expect(result.current.state.solar['291']?.yield_history_wh).toEqual([210, 1840, null, 0]),
    )
  })
})

describe('useRenewvanBus charger entity', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('accumulates charger properties per id, with the source as a plain string', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/charger/1/voltage_v', { toString: () => '13.39' })
    messageHandlers[0]('renewvan/charger/1/current_a', { toString: () => '18.2' })
    messageHandlers[0]('renewvan/charger/1/source', { toString: () => '"alternator"' })
    await waitFor(() =>
      expect(result.current.state.chargers).toEqual({
        '1': { voltage_v: 13.39, current_a: 18.2, source: 'alternator' },
      }),
    )
  })
})

const validInfo = {
  node: 'tank',
  product: 'Tank node',
  source: 'ADS1115 (I2C)',
  publishes: ['tank'],
  version: 'v0.8.0',
}

describe('useRenewvanBus nodes', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('populates a Node from its retained info and health topics', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() =>
      expect(result.current.state.nodes).toEqual({ tank: { info: validInfo, health: 'online' } }),
    )
  })

  it('clears info and health independently when their retained topic is emptied', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.state.nodes.tank?.health).toBe('online'))

    messageHandlers[0]('renewvan/tank/health', { toString: () => '' })
    await waitFor(() => expect(result.current.state.nodes).toEqual({ tank: { info: validInfo } }))

    messageHandlers[0]('renewvan/tank/health', { toString: () => 'offline' })
    messageHandlers[0]('renewvan/tank/info', { toString: () => '' })
    await waitFor(() => expect(result.current.state.nodes).toEqual({ tank: { health: 'offline' } }))

    // Nothing left to say about the Node: it is gone, not an empty record.
    messageHandlers[0]('renewvan/tank/health', { toString: () => '' })
    await waitFor(() => expect(result.current.state.nodes).toEqual({}))
  })

  it.each([
    ['not JSON', 'online'],
    ['a JSON array', '[]'],
    ['a JSON string', '"v0.8.0"'],
    ['null', 'null'],
    ['missing node', JSON.stringify({ ...validInfo, node: undefined })],
    ['missing product', JSON.stringify({ ...validInfo, product: undefined })],
    ['missing source', JSON.stringify({ ...validInfo, source: undefined })],
    ['missing version', JSON.stringify({ ...validInfo, version: undefined })],
    ['a non-string version', JSON.stringify({ ...validInfo, version: 8 })],
    ['publishes not a list', JSON.stringify({ ...validInfo, publishes: 'tank' })],
    ['publishes with a non-string', JSON.stringify({ ...validInfo, publishes: ['tank', 1] })],
  ])('reads info that is %s as no info', async (_name, payload) => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    messageHandlers[0]('renewvan/tank/info', { toString: () => payload })
    await waitFor(() => expect(result.current.state.nodes.tank?.health).toBe('online'))
    expect(result.current.state.nodes).toEqual({ tank: { health: 'online' } })
  })

  it('lets a malformed info replace a good one: the Node then reads as no info', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    await waitFor(() => expect(result.current.state.nodes.tank?.info).toEqual(validInfo))
    messageHandlers[0]('renewvan/tank/info', { toString: () => '{"node":"tank"}' })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.state.nodes).toEqual({ tank: { health: 'online' } }))
  })

  it('accepts info without publishes, and keeps its optional fields', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    const info = {
      node: 'relay',
      product: 'Relay node',
      source: 'ESPHome GPIO',
      version: 'dev',
      manufacturer: 'acme',
      homepage: 'https://example.com/relay',
      host_serial: 'AA:BB:CC:DD:EE:FF',
    }
    messageHandlers[0]('renewvan/relay/info', { toString: () => JSON.stringify(info) })
    await waitFor(() => expect(result.current.state.nodes).toEqual({ relay: { info } }))
  })

  it('reads a Node with info and no health as having no health (Unknown), not offline', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    await waitFor(() => expect(result.current.state.nodes.tank).toBeDefined())
    expect(result.current.state.nodes.tank.health).toBeUndefined()
  })

  it('ignores a health payload that is not online or offline', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'degraded' })
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    await waitFor(() => expect(result.current.state.nodes.tank?.info).toEqual(validInfo))
    expect(result.current.state.nodes.tank.health).toBeUndefined()
  })

  it('never reads demo as a Node: renewvan/demo/health is the demo root, not a Node', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/demo/health', { toString: () => 'online' })
    messageHandlers[0]('renewvan/demo/info', { toString: () => JSON.stringify(validInfo) })
    // A real message after them proves the handler ran past them.
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.state.nodes).toEqual({ tank: { health: 'online' } }))
  })

  it('does not mistake other three-segment host topics for Nodes', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tailscale/status', { toString: () => '{"enabled":true}' })
    messageHandlers[0]('renewvan/kiosk/display/power', { toString: () => 'on' })
    messageHandlers[0]('renewvan/tank/fresh/level_pct', { toString: () => '62' })
    await waitFor(() => expect(result.current.state.tanks).toEqual({ fresh: { level_pct: 62 } }))
    expect(result.current.state.nodes).toEqual({})
  })

  it('keeps a Node entity-neutral: info and health never create an entity', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.state.nodes.tank?.health).toBe('online'))
    expect(result.current.state.tanks).toEqual({})
  })

  // The legacy driver liveness topic is no longer special-cased: with nothing publishing it,
  // it is an ordinary entity topic like any other.
  it('no longer special-cases renewvan/<domain>/driver/status', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/driver/status', { toString: () => '"online"' })
    await waitFor(() =>
      expect(result.current.state.tanks).toEqual({ driver: { status: 'online' } }),
    )
    expect(result.current.state.nodes).toEqual({})
  })
})
