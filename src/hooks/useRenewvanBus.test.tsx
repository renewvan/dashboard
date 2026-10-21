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

  it("tracks the device's health from renewvan/router/health, ignoring unknown payloads", async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/router/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.routerHealth).toBe('online'))
    messageHandlers[0]('renewvan/router/health', { toString: () => 'offline' })
    await waitFor(() => expect(result.current.routerHealth).toBe('offline'))
    messageHandlers[0]('renewvan/router/health', { toString: () => 'rebooting' })
    await waitFor(() => expect(result.current.routerHealth).toBe('offline'))
  })

  it('reads an empty router/health payload as no health, not offline', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/router/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.routerHealth).toBe('online'))
    messageHandlers[0]('renewvan/router/health', { toString: () => '' })
    await waitFor(() => expect(result.current.routerHealth).toBeNull())
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

  it('ignores the device health topic and the <field>/set command topics', async () => {
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

  it('ignores the device liveness topic and the level_zero command topic', async () => {
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
  device: 'tank',
  product: 'Tank device',
  source: 'ADS1115 (I2C)',
  publishes: ['tank'],
  version: 'v0.8.0',
}

describe('useRenewvanBus devices', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('populates a Device from its retained info and health topics', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() =>
      expect(result.current.state.devices).toEqual({ tank: { info: validInfo, health: 'online' } }),
    )
  })

  it('clears info and health independently when their retained topic is emptied', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.state.devices.tank?.health).toBe('online'))

    messageHandlers[0]('renewvan/tank/health', { toString: () => '' })
    await waitFor(() => expect(result.current.state.devices).toEqual({ tank: { info: validInfo } }))

    messageHandlers[0]('renewvan/tank/health', { toString: () => 'offline' })
    messageHandlers[0]('renewvan/tank/info', { toString: () => '' })
    await waitFor(() =>
      expect(result.current.state.devices).toEqual({ tank: { health: 'offline' } }),
    )

    // Nothing left to say about the Device: it is gone, not an empty record.
    messageHandlers[0]('renewvan/tank/health', { toString: () => '' })
    await waitFor(() => expect(result.current.state.devices).toEqual({}))
  })

  it.each([
    ['not JSON', 'online'],
    ['a JSON array', '[]'],
    ['a JSON string', '"v0.8.0"'],
    ['null', 'null'],
    ['missing device', JSON.stringify({ ...validInfo, device: undefined })],
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
    await waitFor(() => expect(result.current.state.devices.tank?.health).toBe('online'))
    expect(result.current.state.devices).toEqual({ tank: { health: 'online' } })
  })

  it('lets a malformed info replace a good one: the Device then reads as no info', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    await waitFor(() => expect(result.current.state.devices.tank?.info).toEqual(validInfo))
    messageHandlers[0]('renewvan/tank/info', { toString: () => '{"device":"tank"}' })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() =>
      expect(result.current.state.devices).toEqual({ tank: { health: 'online' } }),
    )
  })

  it('accepts info without publishes, and keeps its optional fields', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    const info = {
      device: 'relay',
      product: 'Relay device',
      source: 'ESPHome GPIO',
      version: 'dev',
      manufacturer: 'acme',
      homepage: 'https://example.com/relay',
      board_serial: 'AA:BB:CC:DD:EE:FF',
    }
    messageHandlers[0]('renewvan/relay/info', { toString: () => JSON.stringify(info) })
    await waitFor(() => expect(result.current.state.devices).toEqual({ relay: { info } }))
  })

  it('drops an optional field that is not a string, keeping the rest of the info', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', {
      toString: () =>
        JSON.stringify({ ...validInfo, manufacturer: 7, homepage: { a: 1 }, board_serial: ['x'] }),
    })
    await waitFor(() => expect(result.current.state.devices).toEqual({ tank: { info: validInfo } }))
  })

  it('reads a Device with info and no health as having no health (Unknown), not offline', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    await waitFor(() => expect(result.current.state.devices.tank).toBeDefined())
    expect(result.current.state.devices.tank.health).toBeUndefined()
  })

  it('ignores a health payload that is not online or offline', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'degraded' })
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    await waitFor(() => expect(result.current.state.devices.tank?.info).toEqual(validInfo))
    expect(result.current.state.devices.tank.health).toBeUndefined()
  })

  it('never reads demo as a Device: renewvan/demo/health is the demo root, not a Device', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/demo/health', { toString: () => 'online' })
    messageHandlers[0]('renewvan/demo/info', { toString: () => JSON.stringify(validInfo) })
    // A real message after them proves the handler ran past them.
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() =>
      expect(result.current.state.devices).toEqual({ tank: { health: 'online' } }),
    )
  })

  it('does not mistake other three-segment host topics for Devices', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tailscale/status', { toString: () => '{"enabled":true}' })
    messageHandlers[0]('renewvan/kiosk/display/power', { toString: () => 'on' })
    messageHandlers[0]('renewvan/tank/fresh/level_pct', { toString: () => '62' })
    await waitFor(() => expect(result.current.state.tanks).toEqual({ fresh: { level_pct: 62 } }))
    expect(result.current.state.devices).toEqual({})
  })

  it('keeps a Device entity-neutral: info and health never create an entity', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    messageHandlers[0]('renewvan/tank/info', { toString: () => JSON.stringify(validInfo) })
    messageHandlers[0]('renewvan/tank/health', { toString: () => 'online' })
    await waitFor(() => expect(result.current.state.devices.tank?.health).toBe('online'))
    expect(result.current.state.tanks).toEqual({})
  })
})

describe('useRenewvanBus relay entity', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  const send = (topic: string, payload: string) =>
    messageHandlers[0](topic, { toString: () => payload })

  it('accumulates a relay name and state per id', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/relay_03/state', 'false')
    send('renewvan/relay/relay_03/name', '"Water pump"')
    send('renewvan/relay/relay_04/state', 'true')
    await waitFor(() =>
      expect(result.current.state.relays).toEqual({
        relay_03: { state: false, name: 'Water pump' },
        relay_04: { state: true },
      }),
    )
  })

  it('never reads a name as a state: a retained name must not switch a pump on', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/relay_03/state', 'false')
    send('renewvan/relay/relay_03/name', '"Water pump"')
    await waitFor(() => expect(result.current.state.relays.relay_03?.name).toBe('Water pump'))
    expect(result.current.state.relays.relay_03?.state).toBe(false)
  })

  it('shows a relay that has a name but no state yet as having no known state', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/relay_03/name', '"Water pump"')
    await waitFor(() =>
      expect(result.current.state.relays.relay_03).toEqual({ name: 'Water pump' }),
    )
  })

  it('drops the whole relay when its retained state is cleared (the relay is gone, not off)', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/relay_03/state', 'true')
    send('renewvan/relay/relay_04/state', 'true')
    await waitFor(() => expect(Object.keys(result.current.state.relays)).toHaveLength(2))
    send('renewvan/relay/relay_03/state', '')
    await waitFor(() => expect(Object.keys(result.current.state.relays)).toEqual(['relay_04']))
  })

  it('drops only the name when a retained name is cleared', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/relay_03/state', 'true')
    send('renewvan/relay/relay_03/name', '"Water pump"')
    await waitFor(() => expect(result.current.state.relays.relay_03?.name).toBe('Water pump'))
    send('renewvan/relay/relay_03/name', '')
    await waitFor(() => expect(result.current.state.relays.relay_03).toEqual({ state: true }))
  })

  it('ignores a name that is not a string', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/relay_03/state', 'true')
    send('renewvan/relay/relay_03/name', '42')
    send('renewvan/relay/relay_04/state', 'true')
    await waitFor(() => expect(result.current.state.relays.relay_04).toEqual({ state: true }))
    expect(result.current.state.relays.relay_03).toEqual({ state: true })
  })

  it('never reads a relay command as the relay state: the broker echoes our own set back', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    // `set` has four segments, so it reaches the entity reducer: only `state` and `name` may land.
    send('renewvan/relay/relay_03/set', 'true')
    // `name/set` has five segments and never matches the entity pattern at all.
    send('renewvan/relay/relay_03/name/set', '"Water pump"')
    // A real message after them proves the handler ran past them.
    send('renewvan/relay/relay_04/state', 'true')
    await waitFor(() => expect(result.current.state.relays).toEqual({ relay_04: { state: true } }))
  })

  it('ignores a state that is not a JSON boolean: a string "off" must not read as switched on', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/relay_03/state', 'false')
    send('renewvan/relay/relay_03/state', '"off"')
    send('renewvan/relay/relay_03/state', '"false"')
    send('renewvan/relay/relay_03/state', '1')
    send('renewvan/relay/relay_05/state', '"on"')
    send('renewvan/relay/relay_04/state', 'true')
    await waitFor(() => expect(result.current.state.relays.relay_04).toEqual({ state: true }))
    expect(result.current.state.relays.relay_03).toEqual({ state: false })
    expect(result.current.state.relays.relay_05).toBeUndefined()
  })

  it('lets a relay be called health or info: segment count, not the id, tells it from a Device', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send('renewvan/relay/health/state', 'true')
    await waitFor(() => expect(result.current.state.relays).toEqual({ health: { state: true } }))
    expect(result.current.state.devices).toEqual({})
  })
})

describe('useRenewvanBus tailscale status', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  const send = (payload: string) =>
    messageHandlers[0]('renewvan/tailscale/status', { toString: () => payload })

  const status = { enabled: true, connected: true, ip: '100.64.0.1', hostname: 'van', peers: 2 }

  it('reads a status that matches the schema', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send(JSON.stringify(status))
    await waitFor(() => expect(result.current.tailscale).toEqual(status))
  })

  it('accepts a null ip and hostname while not connected', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    const down = { enabled: true, connected: false, ip: null, hostname: null, peers: 0 }
    send(JSON.stringify(down))
    await waitFor(() => expect(result.current.tailscale).toEqual(down))
  })

  it('carries no key the schema does not define', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send(JSON.stringify({ ...status, extra: 'x' }))
    await waitFor(() => expect(result.current.tailscale).toEqual(status))
  })

  it('clears the status when the retained topic is cleared', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send(JSON.stringify(status))
    await waitFor(() => expect(result.current.tailscale).toEqual(status))
    send('')
    await waitFor(() => expect(result.current.tailscale).toBeNull())
  })

  it.each([
    ['a bare boolean', 'true'],
    ['malformed JSON', '{"enabled":'],
    ['a missing field', JSON.stringify({ enabled: true, peers: 2 })],
    ['a non-boolean connected', JSON.stringify({ ...status, connected: 'yes' })],
    ['a numeric ip', JSON.stringify({ ...status, ip: 100 })],
    ['a fractional peer count', JSON.stringify({ ...status, peers: 1.5 })],
    ['a negative peer count', JSON.stringify({ ...status, peers: -1 })],
    ['an array', JSON.stringify([status])],
  ])('reads %s as no status, so the last one does not stay on screen', async (_, payload) => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(connectMock).toHaveBeenCalled())
    send(JSON.stringify(status))
    await waitFor(() => expect(result.current.tailscale).toEqual(status))
    send(payload)
    await waitFor(() => expect(result.current.tailscale).toBeNull())
  })
})
