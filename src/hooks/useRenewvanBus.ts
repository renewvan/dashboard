import { useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { emptyRenewvanBusState, type RenewvanBusState } from '../types'
import { getEnv } from '../config/runtimeEnv'

// Client-side MQTT-over-WebSocket connection to the renewvan bus broker
// (Mosquitto's WS listener), per
// hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md -- no
// polling backend, not offline-first. This is the thin adapter half of the
// ticket's seam: it owns the live connection (connection lifecycle itself
// stays untested); the payload-handling contract — what each topic does
// to the exposed state — is tested in useRenewvanBus.test.tsx against a
// mocked client. The presentational components it feeds are tested
// separately against fixed props.

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'
export type DisplayPower = 'on' | 'off' | null
export type AutoSleepTimeoutMinutes = 1 | 5 | 15 | 30

export interface TailscaleStatus {
  enabled: boolean
  connected: boolean
  ip: string | null
  hostname: string | null
  peers: number
}

export interface RenewvanBus {
  state: RenewvanBusState
  status: ConnectionStatus
  displayPower: DisplayPower
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
  tailscale: TailscaleStatus | null
  uplink: UplinkStatus | null
  publish: (topic: string, payload: string) => void
}

export type UplinkPath = 'lan' | 'wifi' | 'none'

export interface UplinkStatus {
  path: UplinkPath
  online: boolean
  ssid: string | null
  interface: string | null
  ip: string | null
}

const TOPIC_PATTERN = /^renewvan\/(tank|relay|battery)\/([^/]+)\/([^/]+)$/
const TOPIC_DISPLAY_POWER = 'renewvan/kiosk/display/power'
const TOPIC_BRIGHTNESS = 'renewvan/kiosk/display/brightness'
const TOPIC_AUTO_SLEEP_ENABLED = 'renewvan/kiosk/display/auto-sleep-enabled'
const TOPIC_AUTO_SLEEP_TIMEOUT = 'renewvan/kiosk/display/auto-sleep-timeout-minutes'
const TOPIC_TAILSCALE = 'renewvan/tailscale/status'
const TOPIC_UPLINK = 'renewvan/uplink/status'
const AUTO_SLEEP_TIMEOUT_CHOICES: AutoSleepTimeoutMinutes[] = [1, 5, 15, 30]

/**
 * Every `renewvan/<domain>/<id>/<property>` payload is the JSON-encoded
 * value for that property's declared schema type (see
 * `tank.schema.json`/`battery.schema.json`) — a bare number for
 * `number` properties, a *quoted* string for `string` properties (e.g.
 * the wire payload for `status` is literally `"ok"`, not `ok`). Skipping
 * `JSON.parse` here previously left string properties (`fluid_type`,
 * `status`, `charge_state`) holding their quote characters, so
 * `status === 'ok'` silently failed for every tank/battery regardless of
 * its real state.
 */
function parseValue(payload: string): unknown {
  try {
    return JSON.parse(payload)
  } catch {
    return undefined
  }
}

function applyMessage(prev: RenewvanBusState, topic: string, payload: string): RenewvanBusState {
  const match = TOPIC_PATTERN.exec(topic)
  if (!match) return prev
  const [, domain, id, property] = match
  const value = parseValue(payload)
  if (value === undefined) return prev

  if (domain === 'tank') {
    return {
      ...prev,
      tanks: {
        ...prev.tanks,
        [id]: { ...prev.tanks[id], [property]: value } as RenewvanBusState['tanks'][string],
      },
    }
  }
  if (domain === 'battery') {
    return {
      ...prev,
      batteries: {
        ...prev.batteries,
        [id]: { ...prev.batteries[id], [property]: value } as RenewvanBusState['batteries'][string],
      },
    }
  }
  // relay: only `state`, a JSON boolean.
  return {
    ...prev,
    relays: { ...prev.relays, [id]: { state: Boolean(value) } },
  }
}

/**
 * Subscribes to `renewvan/#` over MQTT-over-WebSocket and exposes the
 * accumulated retained state plus connection status. Env-configured via
 * `VITE_MQTT_WS_URL` (required), `VITE_MQTT_USERNAME`/`VITE_MQTT_PASSWORD`
 * (read-scoped credentials, optional while the broker allows anonymous
 * access) -- resolved at runtime first, build-time as fallback; see
 * `../config/runtimeEnv`.
 */
export function useRenewvanBus(): RenewvanBus {
  const [state, setState] = useState<RenewvanBusState>(emptyRenewvanBusState)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [displayPower, setDisplayPower] = useState<DisplayPower>(null)
  const [brightness, setBrightness] = useState<number | null>(null)
  const [autoSleepEnabled, setAutoSleepEnabled] = useState<boolean | null>(null)
  const [autoSleepTimeoutMinutes, setAutoSleepTimeoutMinutes] =
    useState<AutoSleepTimeoutMinutes | null>(null)
  const [tailscale, setTailscale] = useState<TailscaleStatus | null>(null)
  const [uplink, setUplink] = useState<UplinkStatus | null>(null)
  const clientRef = useRef<MqttClient | null>(null)

  const publish = (topic: string, payload: string) => {
    clientRef.current?.publish(topic, payload, { qos: 1, retain: false })
  }

  useEffect(() => {
    const url = getEnv('VITE_MQTT_WS_URL')
    if (!url) {
      setStatus('disconnected')
      return
    }

    const client = mqtt.connect(url, {
      username: getEnv('VITE_MQTT_USERNAME'),
      password: getEnv('VITE_MQTT_PASSWORD'),
      reconnectPeriod: 2000,
    })
    clientRef.current = client

    client.on('connect', () => {
      setStatus('connected')
      client.subscribe('renewvan/#')
    })
    client.on('reconnect', () => setStatus('connecting'))
    client.on('close', () => setStatus('disconnected'))
    client.on('offline', () => setStatus('disconnected'))
    client.on('error', () => setStatus('disconnected'))
    client.on('message', (topic, message) => {
      const payload = message.toString()
      if (topic === TOPIC_DISPLAY_POWER) {
        if (payload === 'on' || payload === 'off') setDisplayPower(payload)
        return
      }
      if (topic === TOPIC_BRIGHTNESS) {
        const value = Number(payload)
        if (Number.isInteger(value) && value >= 0 && value <= 100) setBrightness(value)
        return
      }
      if (topic === TOPIC_AUTO_SLEEP_ENABLED) {
        if (payload === 'true' || payload === 'false') setAutoSleepEnabled(payload === 'true')
        return
      }
      if (topic === TOPIC_AUTO_SLEEP_TIMEOUT) {
        const value = Number(payload)
        if (AUTO_SLEEP_TIMEOUT_CHOICES.includes(value as AutoSleepTimeoutMinutes)) {
          setAutoSleepTimeoutMinutes(value as AutoSleepTimeoutMinutes)
        }
        return
      }
      if (topic === TOPIC_TAILSCALE) {
        try {
          setTailscale(JSON.parse(payload) as TailscaleStatus)
        } catch {
          // malformed payload — ignore
        }
        return
      }
      if (topic === TOPIC_UPLINK) {
        try {
          setUplink(JSON.parse(payload) as UplinkStatus)
        } catch {
          // malformed payload — ignore
        }
        return
      }
      setState((prev) => applyMessage(prev, topic, payload))
    })

    return () => {
      client.end(true)
      clientRef.current = null
    }
  }, [])

  return {
    state,
    status,
    displayPower,
    brightness,
    autoSleepEnabled,
    autoSleepTimeoutMinutes,
    tailscale,
    uplink,
    publish,
  }
}
