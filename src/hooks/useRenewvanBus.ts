import { useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { emptyRenewvanBusState, type RenewvanBusState } from '@/types'
import { getEnv } from '@/config/runtimeEnv'

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
export type RouterHealth = 'online' | 'offline'
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
  routerHealth: RouterHealth | null
  publish: (topic: string, payload: string) => void
}

/** The real van's topic root; every host plugin (kiosk, tailscale) lives here, always. */
const REAL_ROOT = 'renewvan'
/** The simulated van's topic root (hub `docs/demo-mode.md`): same shapes as the real root. */
const DEMO_ROOT = 'renewvan-demo'

// `<id>/<property>` is exactly two segments, so the temperature node's
// `<id>/name/set` and `<id>/unit/set` command topics (three) never match.
function entityPattern(root: string): RegExp {
  return new RegExp(
    `^${root}/(tank|relay|battery|solar|charger|router|gps|temperature|tilt)/([^/]+)/([^/]+)$`,
  )
}
const ENTITY_PATTERN = { real: entityPattern(REAL_ROOT), demo: entityPattern(DEMO_ROOT) }
// Every driver publishes `renewvan/<domain>/driver/status` ("online"/"offline") as its LWT
// liveness. It fits the two-segment entity shape with id `driver`, so it is dropped explicitly.
const DRIVER_LIVENESS_ID = 'driver'
// The kiosk and tailscale topics are host plugins that no demo node simulates, so they stay on the
// real root in demo mode: a demo van still dims and sleeps the real screen.
const KIOSK_PREFIX = `${REAL_ROOT}/kiosk/`
const TOPIC_DISPLAY_POWER = `${KIOSK_PREFIX}display/power`
const TOPIC_BRIGHTNESS = `${KIOSK_PREFIX}display/brightness`
const TOPIC_AUTO_SLEEP_ENABLED = `${KIOSK_PREFIX}display/auto-sleep-enabled`
const TOPIC_AUTO_SLEEP_TIMEOUT = `${KIOSK_PREFIX}display/auto-sleep-timeout-minutes`
const TOPIC_TAILSCALE = `${REAL_ROOT}/tailscale/status`
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

/** Spread-accumulate one entity property into its per-id record — the
 * shared shape of the tank/battery/router entity topics. */
function accumulate<T>(
  record: Record<string, T>,
  id: string,
  property: string,
  value: unknown,
): Record<string, T> {
  return { ...record, [id]: { ...record[id], [property]: value } as T }
}

function applyMessage(
  prev: RenewvanBusState,
  topic: string,
  payload: string,
  pattern: RegExp,
): RenewvanBusState {
  const match = pattern.exec(topic)
  if (!match) return prev
  const [, domain, id, property] = match
  if (id === DRIVER_LIVENESS_ID) return prev
  const value = parseValue(payload)
  if (domain === 'router') {
    return {
      ...prev,
      routers: accumulate(prev.routers, id, property, value),
      routerUpdatedAt: { ...prev.routerUpdatedAt, [id]: Date.now() },
    }
  }
  if (domain === 'tank') return { ...prev, tanks: accumulate(prev.tanks, id, property, value) }
  if (domain === 'gps') return { ...prev, gps: accumulate(prev.gps, id, property, value) }
  if (domain === 'tilt') return { ...prev, tilt: accumulate(prev.tilt, id, property, value) }
  if (domain === 'temperature') {
    return { ...prev, temperatures: accumulate(prev.temperatures, id, property, value) }
  }
  if (domain === 'battery') {
    return { ...prev, batteries: accumulate(prev.batteries, id, property, value) }
  }
  if (domain === 'solar') return { ...prev, solar: accumulate(prev.solar, id, property, value) }
  if (domain === 'charger') {
    return { ...prev, chargers: accumulate(prev.chargers, id, property, value) }
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
 *
 * `demo` (default off, see `useDemoMode`) reads the simulated van instead
 * (hub `docs/demo-mode.md`): entity topics and `router/health` come from
 * `renewvan-demo/` only, while the kiosk and tailscale host plugins stay on
 * the real `renewvan/` root (no demo node simulates them). Real entity topics
 * are ignored in demo mode and vice versa, and flipping the flag drops the
 * client and every accumulated value before reconnecting, so real and fake
 * data never mix. Demo state is read-only: `publish` sends only kiosk
 * commands in demo mode.
 */
export function useRenewvanBus({ demo = false }: { demo?: boolean } = {}): RenewvanBus {
  const [state, setState] = useState<RenewvanBusState>(emptyRenewvanBusState)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [displayPower, setDisplayPower] = useState<DisplayPower>(null)
  const [brightness, setBrightness] = useState<number | null>(null)
  const [autoSleepEnabled, setAutoSleepEnabled] = useState<boolean | null>(null)
  const [autoSleepTimeoutMinutes, setAutoSleepTimeoutMinutes] =
    useState<AutoSleepTimeoutMinutes | null>(null)
  const [tailscale, setTailscale] = useState<TailscaleStatus | null>(null)
  const [routerHealth, setRouterHealth] = useState<RouterHealth | null>(null)
  const clientRef = useRef<MqttClient | null>(null)

  const publish = (topic: string, payload: string) => {
    if (demo && !topic.startsWith(KIOSK_PREFIX)) return
    clientRef.current?.publish(topic, payload, { qos: 1, retain: false })
  }

  useEffect(() => {
    const url = getEnv('VITE_MQTT_WS_URL')
    if (!url) {
      setStatus('disconnected')
      return
    }

    const pattern = demo ? ENTITY_PATTERN.demo : ENTITY_PATTERN.real
    const topicRouterHealth = `${demo ? DEMO_ROOT : REAL_ROOT}/router/health`
    let disposed = false

    const client = mqtt.connect(url, {
      username: getEnv('VITE_MQTT_USERNAME'),
      password: getEnv('VITE_MQTT_PASSWORD'),
      reconnectPeriod: 2000,
    })
    clientRef.current = client

    // `end()` fires `close` after the cleanup below has reset the status: a torn-down client
    // must not write any state again.
    const onStatus = (next: ConnectionStatus) => () => {
      if (!disposed) setStatus(next)
    }
    client.on('connect', () => {
      if (disposed) return
      setStatus('connected')
      client.subscribe(
        demo ? [`${DEMO_ROOT}/#`, `${KIOSK_PREFIX}#`, TOPIC_TAILSCALE] : `${REAL_ROOT}/#`,
      )
    })
    client.on('reconnect', onStatus('connecting'))
    client.on('close', onStatus('disconnected'))
    client.on('offline', onStatus('disconnected'))
    client.on('error', onStatus('disconnected'))
    client.on('message', (topic, message) => {
      if (disposed) return
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
      if (topic === topicRouterHealth) {
        if (payload === 'online' || payload === 'offline') setRouterHealth(payload)
        return
      }
      setState((prev) => applyMessage(prev, topic, payload, pattern))
    })

    return () => {
      disposed = true
      client.end(true)
      clientRef.current = null
      // Nothing read from this root may outlive it: a flip must never show the other van's values.
      setState(emptyRenewvanBusState)
      setStatus('connecting')
      setDisplayPower(null)
      setBrightness(null)
      setAutoSleepEnabled(null)
      setAutoSleepTimeoutMinutes(null)
      setTailscale(null)
      setRouterHealth(null)
    }
  }, [demo])

  return {
    state,
    status,
    displayPower,
    brightness,
    autoSleepEnabled,
    autoSleepTimeoutMinutes,
    tailscale,
    routerHealth,
    publish,
  }
}
