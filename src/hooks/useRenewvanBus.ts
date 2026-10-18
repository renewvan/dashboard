import { useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { emptyRenewvanBusState, type NodeInfo, type RenewvanBusState } from '@/types'
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
  /** The shared Demo mode flag (`renewvan/demo/enabled`): true while every client reads the simulated van. */
  demoMode: boolean
  /** Asks `node-demo` to switch demo mode; the view only changes when the bus reports it did. */
  setDemoMode: (demo: boolean) => void
  publish: (topic: string, payload: string) => void
}

/** The real van's topic root; every host plugin (kiosk, tailscale) lives here, always. */
const REAL_ROOT = 'renewvan'
/**
 * The simulated van's namespace (hub `docs/demo-mode.md`), under the real root: same shapes as the
 * real topics, one level down. `demo` is not an entity domain, so the real pattern can never match
 * it, and the logger (exactly four segments, entity domains only) drops all of it.
 */
const DEMO_ROOT = `${REAL_ROOT}/demo`
/** The shared switch: retained state, plus its `/set` command (same convention as the kiosk settings). */
const TOPIC_DEMO_ENABLED = `${DEMO_ROOT}/enabled`
const TOPIC_DEMO_ENABLED_SET = `${TOPIC_DEMO_ENABLED}/set`

// `<id>/<property>` is exactly two segments, so the temperature node's
// `<id>/name/set` and `<id>/unit/set` command topics (three) never match.
function entityPattern(root: string): RegExp {
  return new RegExp(
    `^${root}/(tank|relay|battery|solar|charger|router|gps|temperature|tilt)/([^/]+)/([^/]+)$`,
  )
}
const ENTITY_PATTERN = { real: entityPattern(REAL_ROOT), demo: entityPattern(DEMO_ROOT) }

/**
 * `<root>/<node>/info` and `<root>/<node>/health`: three segments, so never an entity topic (four).
 * `demo` sits where a Node key would on the real root and is reserved: it is the simulated van's
 * namespace, never a Node, so the real pattern excludes it and its own `renewvan/demo/health`
 * (a topic retained on real brokers) cannot become a Node.
 */
function nodePattern(root: string, reserved: string | null): RegExp {
  const key = reserved === null ? '[^/]+' : `(?!${reserved}/)[^/]+`
  return new RegExp(`^${root}/(${key})/(info|health)$`)
}
const NODE_PATTERN = { real: nodePattern(REAL_ROOT, 'demo'), demo: nodePattern(DEMO_ROOT, null) }
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

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** `value` when it is a string, else nothing: an optional info field of the wrong type is dropped. */
function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

/**
 * The dashboard's light structural check of a Node info payload (no schema library): a JSON object
 * with string `node`, `product`, `source` and `version`, and `publishes` a list of strings if
 * present. Anything else reads as no info. The optional `manufacturer`, `homepage` and
 * `host_serial` are kept only when they are strings, and no other key is carried into state.
 */
function parseNodeInfo(payload: string): NodeInfo | undefined {
  const value = parseValue(payload)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const o = value as Record<string, unknown>
  if (
    typeof o.node !== 'string' ||
    typeof o.product !== 'string' ||
    typeof o.source !== 'string' ||
    typeof o.version !== 'string'
  ) {
    return undefined
  }
  if (o.publishes !== undefined && !isStringList(o.publishes)) return undefined
  const info: NodeInfo = { node: o.node, product: o.product, source: o.source, version: o.version }
  if (o.publishes !== undefined) info.publishes = o.publishes
  const manufacturer = optionalString(o.manufacturer)
  if (manufacturer !== undefined) info.manufacturer = manufacturer
  const homepage = optionalString(o.homepage)
  if (homepage !== undefined) info.homepage = homepage
  const hostSerial = optionalString(o.host_serial)
  if (hostSerial !== undefined) info.host_serial = hostSerial
  return info
}

/** An empty payload clears a retained topic; so does anything that is not a valid value. */
function applyNodeMessage(
  prev: RenewvanBusState,
  key: string,
  topic: 'info' | 'health',
  payload: string,
): RenewvanBusState {
  const { [key]: current, ...others } = prev.nodes
  const next = { ...current }
  if (topic === 'info') {
    const info = parseNodeInfo(payload)
    if (info) next.info = info
    else delete next.info
  } else if (payload === 'online' || payload === 'offline') {
    next.health = payload
  } else {
    delete next.health
  }
  const empty = next.info === undefined && next.health === undefined
  return { ...prev, nodes: empty ? others : { ...others, [key]: next } }
}

function applyMessage(
  prev: RenewvanBusState,
  topic: string,
  payload: string,
  pattern: RegExp,
  nodeTopicPattern: RegExp,
): RenewvanBusState {
  const nodeMatch = nodeTopicPattern.exec(topic)
  if (nodeMatch) {
    return applyNodeMessage(prev, nodeMatch[1], nodeMatch[2] as 'info' | 'health', payload)
  }
  const match = pattern.exec(topic)
  if (!match) return prev
  const [, domain, id, property] = match
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
  // relay: only `state`, a JSON boolean. An empty payload is a retained-topic clear (ADR 0008):
  // the relay is gone, which is not the same as switched off.
  if (value === undefined) {
    const { [id]: _removed, ...rest } = prev.relays
    return { ...prev, relays: rest }
  }
  return {
    ...prev,
    relays: { ...prev.relays, [id]: { state: Boolean(value) } },
  }
}

/**
 * Subscribes to `renewvan/#` (which includes the `renewvan/demo/` namespace) over MQTT-over-WebSocket and exposes the
 * accumulated retained state plus connection status. Env-configured via
 * `VITE_MQTT_WS_URL` (required), `VITE_MQTT_USERNAME`/`VITE_MQTT_PASSWORD`
 * (read-scoped credentials, optional while the broker allows anonymous
 * access) -- resolved at runtime first, build-time as fallback; see
 * `../config/runtimeEnv`.
 *
 * Demo mode is one shared switch on the bus (hub `docs/demo-mode.md`), not a per-client
 * preference: `renewvan/demo/enabled` is retained, `node-demo` publishes the simulated van while
 * it is `true`, and every client follows it, so toggling in one dashboard shows the demo in all.
 * Each root's entities are accumulated separately and the flag picks which one is exposed, so
 * switching is instant (no reconnect) and real and simulated values can never mix. The kiosk and
 * tailscale host plugins stay on the real root: no demo node simulates them. Demo state is
 * read-only: while the switch is on, `publish` sends only kiosk commands.
 *
 * Each Node's retained `info` and `health` (`renewvan/<node>/info|health`) accumulate into
 * `state.nodes` per root, and `routerHealth` is read off the router Node's health there.
 */
export function useRenewvanBus(): RenewvanBus {
  const [real, setReal] = useState<RenewvanBusState>(emptyRenewvanBusState)
  const [demo, setDemo] = useState<RenewvanBusState>(emptyRenewvanBusState)
  const [demoMode, setDemoModeState] = useState(false)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const [displayPower, setDisplayPower] = useState<DisplayPower>(null)
  const [brightness, setBrightness] = useState<number | null>(null)
  const [autoSleepEnabled, setAutoSleepEnabled] = useState<boolean | null>(null)
  const [autoSleepTimeoutMinutes, setAutoSleepTimeoutMinutes] =
    useState<AutoSleepTimeoutMinutes | null>(null)
  const [tailscale, setTailscale] = useState<TailscaleStatus | null>(null)
  const clientRef = useRef<MqttClient | null>(null)
  // The message handler lives in a mount-once effect, so it reads the flag through a ref.
  const demoModeRef = useRef(false)
  demoModeRef.current = demoMode

  const publish = (topic: string, payload: string) => {
    if (demoModeRef.current && !topic.startsWith(KIOSK_PREFIX)) return
    clientRef.current?.publish(topic, payload, { qos: 1, retain: false })
  }

  // Not routed through `publish`: the switch itself is the one non-kiosk command demo mode allows.
  const setDemoMode = (next: boolean) => {
    clientRef.current?.publish(TOPIC_DEMO_ENABLED_SET, JSON.stringify(next), {
      qos: 1,
      retain: false,
    })
  }

  useEffect(() => {
    const url = getEnv('VITE_MQTT_WS_URL')
    if (!url) {
      setStatus('disconnected')
      return
    }

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
      // One wildcard: `renewvan/#` already covers `renewvan/demo/#`, and a second subscription
      // would make the broker deliver every demo message twice.
      client.subscribe(`${REAL_ROOT}/#`)
    })
    client.on('reconnect', onStatus('connecting'))
    client.on('close', onStatus('disconnected'))
    client.on('offline', onStatus('disconnected'))
    client.on('error', onStatus('disconnected'))
    client.on('message', (topic, message) => {
      if (disposed) return
      const payload = message.toString()
      if (topic === TOPIC_DEMO_ENABLED) {
        // A JSON boolean, like every bus payload; anything else is not a state.
        if (payload === 'true' || payload === 'false') setDemoModeState(payload === 'true')
        return
      }
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
      setReal((prev) => applyMessage(prev, topic, payload, ENTITY_PATTERN.real, NODE_PATTERN.real))
      setDemo((prev) => applyMessage(prev, topic, payload, ENTITY_PATTERN.demo, NODE_PATTERN.demo))
    })

    return () => {
      disposed = true
      client.end(true)
      clientRef.current = null
      setReal(emptyRenewvanBusState)
      setDemo(emptyRenewvanBusState)
      setDemoModeState(false)
      setStatus('connecting')
      setDisplayPower(null)
      setBrightness(null)
      setAutoSleepEnabled(null)
      setAutoSleepTimeoutMinutes(null)
      setTailscale(null)
    }
  }, [])

  const state = demoMode ? demo : real
  return {
    state,
    status,
    displayPower,
    brightness,
    autoSleepEnabled,
    autoSleepTimeoutMinutes,
    tailscale,
    routerHealth: state.nodes.router?.health ?? null,
    demoMode,
    setDemoMode,
    publish,
  }
}
