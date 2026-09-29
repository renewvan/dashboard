import { renderHook, waitFor } from '@testing-library/react'
import type { MqttClient } from 'mqtt'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

const uplinkPayload = { path: 'wifi', online: true, ssid: 'VanNet', interface: 'wlan0', ip: '192.168.1.42' }

describe('useRenewvanBus uplink field', () => {
  beforeEach(() => {
    messageHandlers.length = 0
    connectMock.mockClear()
    vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  })

  it('starts with uplink null until a message arrives', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(result.current.status).toBe('connected'))
    expect(result.current.uplink).toBeNull()
  })

  it('stores a parsed renewvan/uplink/status payload', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(messageHandlers.length).toBeGreaterThan(0))

    messageHandlers[0]('renewvan/uplink/status', { toString: () => JSON.stringify(uplinkPayload) })
    await waitFor(() =>
      expect(result.current.uplink).toEqual({
        path: 'wifi',
        online: true,
        ssid: 'VanNet',
        interface: 'wlan0',
        ip: '192.168.1.42',
      }),
    )
  })

  it('leaves the previous uplink in place on a malformed payload, and ignores unrelated topics', async () => {
    const { result } = renderHook(() => useRenewvanBus())
    await waitFor(() => expect(messageHandlers.length).toBeGreaterThan(0))
    messageHandlers[0]('renewvan/uplink/status', { toString: () => JSON.stringify(uplinkPayload) })
    await waitFor(() => expect(result.current.uplink).not.toBeNull())

    messageHandlers[0]('renewvan/uplink/status', { toString: () => 'not json' })
    messageHandlers[0]('renewvan/tank/tank-1/level', { toString: () => '42' })
    expect(result.current.uplink).toEqual(uplinkPayload)
  })
})
