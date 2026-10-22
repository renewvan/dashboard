import { useCallback, useEffect, useRef, useState } from 'react'
import mqtt, { type MqttClient } from 'mqtt'
import { emptyRenewvanBusState, type DeviceInfo, type RenewvanBusState } from '@/types'
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

/**
 * The hub plugin's retained status (hub `hub-status.schema.json`): the Pi's own local-network
 * address, read from the Pi itself, so it is there whether or not a router Device is installed.
 */
export interface HubStatus {
  ip: string | null
  hostname: string | null
}

export interface RenewvanBus {
  state: RenewvanBusState
  status: ConnectionStatus
  displayPower: DisplayPower
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
  tailscale: TailscaleStatus | null
  /** The Pi's own address (`renewvan/hub/status`); null until the retained topic arrives. */
  hubStatus: HubStatus | null
  routerHealth: RouterHealth | null
  /** The shared Demo mode flag (`renewvan/demo/enabled`): true while every client reads the simulated van. */
  demoMode: boolean
  /** Asks `driver-demo` to switch demo mode; the view only changes when the bus reports it did. */
  setDemoMode: (demo: boolean) => void
  publish: (topic: string, payload: string) => void
}

/** The real van's topic root; every host plugin (kiosk, tailscale, hub) lives here, always. */
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

// `<id>/<property>` is exactly two segments, so the temperature device's
// `<id>/name/set` and `<id>/unit/set` command topics (three) never match.
function entityPattern(root: string): RegExp {
  return new RegExp(
    `^${root}/(tank|relay|battery|solar|charger|router|gps|temperature|tilt)/([^/]+)/([^/]+)$`,
  )
}
const ENTITY_PATTERN = { real: entityPattern(REAL_ROOT), demo: entityPattern(DEMO_ROOT) }

/**
 * `<root>/<device>/info` and `<root>/<device>/health`: three segments, so never an entity topic (four).
 * `demo` sits where a Device key would on the real root and is reserved: it is the simulated van's
 * namespace, never a Device, so the real pattern excludes it and its own `renewvan/demo/health`
 * (a topic retained on real brokers) cannot become a Device.
 */
function devicePattern(root: string, reserved: string | null): RegExp {
  const key = reserved === null ? '[^/]+' : `(?!${reserved}/)[^/]+`
  return new RegExp(`^${root}/(${key})/(info|health)$`)
}
const DEVICE_PATTERN = {
  real: devicePattern(REAL_ROOT, 'demo'),
  demo: devicePattern(DEMO_ROOT, null),
}
// The kiosk, tailscale and hub topics are host plugins that no demo device simulates, so they stay
// on the real root in demo mode: a demo van still dims and sleeps the real screen.
const KIOSK_PREFIX = `${REAL_ROOT}/kiosk/`
const TOPIC_DISPLAY_POWER = `${KIOSK_PREFIX}display/power`
const TOPIC_BRIGHTNESS = `${KIOSK_PREFIX}display/brightness`
const TOPIC_AUTO_SLEEP_ENABLED = `${KIOSK_PREFIX}display/auto-sleep-enabled`
const TOPIC_AUTO_SLEEP_TIMEOUT = `${KIOSK_PREFIX}display/auto-sleep-timeout-minutes`
const TOPIC_TAILSCALE = `${REAL_ROOT}/tailscale/status`
const TOPIC_HUB_STATUS = `${REAL_ROOT}/hub/status`
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

const IPV4 = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/

/** `value` when it is an IPv4 dotted quad other than the unspecified `0.0.0.0` (the schema's rule), else nothing. */
function optionalIpv4(value: unknown): string | undefined {
  return typeof value === 'string' && value !== '0.0.0.0' && IPV4.test(value) ? value : undefined
}

/**
 * The dashboard's light structural check of a Device info payload (no schema library): a JSON object
 * with string `device`, `product`, `source` and `version`, and `publishes` a list of strings if
 * present. Anything else reads as no info. The optional `manufacturer`, `homepage`,
 * `board_serial` and `ip` are kept only when they are valid (a string; an IPv4 dotted quad for `ip`),
 * and no other key is carried into state.
 */
function parseDeviceInfo(payload: string): DeviceInfo | undefined {
  const value = parseValue(payload)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const o = value as Record<string, unknown>
  if (
    typeof o.device !== 'string' ||
    typeof o.product !== 'string' ||
    typeof o.source !== 'string' ||
    typeof o.version !== 'string'
  ) {
    return undefined
  }
  if (o.publishes !== undefined && !isStringList(o.publishes)) return undefined
  const info: DeviceInfo = {
    device: o.device,
    product: o.product,
    source: o.source,
    version: o.version,
  }
  if (o.publishes !== undefined) info.publishes = o.publishes
  const manufacturer = optionalString(o.manufacturer)
  if (manufacturer !== undefined) info.manufacturer = manufacturer
  const homepage = optionalString(o.homepage)
  if (homepage !== undefined) info.homepage = homepage
  const boardSerial = optionalString(o.board_serial)
  if (boardSerial !== undefined) info.board_serial = boardSerial
  const ip = optionalIpv4(o.ip)
  if (ip !== undefined) info.ip = ip
  return info
}

function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

/**
 * The Tailscale plugin's retained status (hub `tailscale-status.schema.json`): a JSON object with
 * boolean `enabled` and `connected`, `ip` and `hostname` a string or null, and `peers` a whole
 * number ≥ 0, all required. An empty payload clears the retained topic, and anything else reads as
 * no status too, like a Device's info: a stale or malformed status must not stay on screen.
 */
function parseTailscaleStatus(payload: string): TailscaleStatus | null {
  const value = parseValue(payload)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  if (
    typeof o.enabled !== 'boolean' ||
    typeof o.connected !== 'boolean' ||
    !isStringOrNull(o.ip) ||
    !isStringOrNull(o.hostname) ||
    typeof o.peers !== 'number' ||
    !Number.isInteger(o.peers) ||
    o.peers < 0
  ) {
    return null
  }
  return {
    enabled: o.enabled,
    connected: o.connected,
    ip: o.ip,
    hostname: o.hostname,
    peers: o.peers,
  }
}

/**
 * The hub plugin's retained status (hub `hub-status.schema.json`): a JSON object with `ip` and
 * `hostname`, each a string or null, both required. Same rule as the Tailscale status: an empty
 * payload clears the topic and anything malformed reads as no status, so a stale address is never
 * shown as the hub's.
 */
function parseHubStatus(payload: string): HubStatus | null {
  const value = parseValue(payload)
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  const o = value as Record<string, unknown>
  if (!isStringOrNull(o.ip) || !isStringOrNull(o.hostname)) return null
  // `undefined` fails `isStringOrNull`, so a payload missing either required key is rejected above.
  return { ip: o.ip, hostname: o.hostname }
}

/** An empty payload clears a retained topic; so does anything that is not a valid value. */
function applyDeviceMessage(
  prev: RenewvanBusState,
  key: string,
  topic: 'info' | 'health',
  payload: string,
): RenewvanBusState {
  const { [key]: current, ...others } = prev.devices
  const next = { ...current }
  if (topic === 'info') {
    const info = parseDeviceInfo(payload)
    if (info) next.info = info
    else delete next.info
  } else if (payload === 'online' || payload === 'offline') {
    next.health = payload
  } else {
    delete next.health
  }
  const empty = next.info === undefined && next.health === undefined
  return { ...prev, devices: empty ? others : { ...others, [key]: next } }
}

/**
 * relay: `state` (a JSON boolean) and the optional `name` (a non-empty JSON string), nothing else.
 * `set` is a four-segment topic, so the broker's echo of our own command reaches this reducer: it
 * must never land as state. An empty payload is a retained-topic clear (ADR 0008): clearing
 * `state` means the relay is gone (not the same as switched off); clearing `name` drops only the
 * label.
 */
function applyRelayMessage(
  prev: RenewvanBusState,
  id: string,
  property: string,
  value: unknown,
): RenewvanBusState {
  if (property !== 'state' && property !== 'name') return prev
  if (value === undefined) {
    if (property === 'state') {
      const { [id]: _removed, ...rest } = prev.relays
      return { ...prev, relays: rest }
    }
    const { name: _name, ...kept } = prev.relays[id] ?? {}
    return { ...prev, relays: { ...prev.relays, [id]: kept } }
  }
  if (property === 'state') {
    // Only a JSON boolean is a state: coercing would read `"off"` or `"false"` as switched on.
    if (typeof value !== 'boolean') return prev
    return {
      ...prev,
      relays: { ...prev.relays, [id]: { ...prev.relays[id], state: value } },
    }
  }
  if (typeof value !== 'string' || value === '') return prev
  return { ...prev, relays: { ...prev.relays, [id]: { ...prev.relays[id], name: value } } }
}

function applyMessage(
  prev: RenewvanBusState,
  topic: string,
  payload: string,
  pattern: RegExp,
  deviceTopicPattern: RegExp,
): RenewvanBusState {
  const deviceMatch = deviceTopicPattern.exec(topic)
  if (deviceMatch) {
    return applyDeviceMessage(prev, deviceMatch[1], deviceMatch[2] as 'info' | 'health', payload)
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
  return applyRelayMessage(prev, id, property, value)
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
 * preference: `renewvan/demo/enabled` is retained, `driver-demo` publishes the simulated van while
 * it is `true`, and every client follows it, so toggling in one dashboard shows the demo in all.
 * Each root's entities are accumulated separately and the flag picks which one is exposed, so
 * switching is instant (no reconnect) and real and simulated values can never mix. The kiosk,
 * tailscale and hub host plugins stay on the real root: no demo device simulates them. Demo state is
 * read-only: while the switch is on, `publish` sends only kiosk commands.
 *
 * Each Device's retained `info` and `health` (`renewvan/<device>/info|health`) accumulate into
 * `state.devices` per root, and `routerHealth` is read off the router Device's health there.
 */
export function useRenewvanBus(): RenewvanBus {
  const [real, setReal] = useState<RenewvanBusState>(emptyRenewvanBusState)
  const [demo, setDemo] = useState<RenewvanBusState>(emptyRenewvanBusState)
  const [demoMode, setDemoModeState] = useState(false)
  // Without a broker URL the effect never connects, so the bus starts (and stays) disconnected.
  const [status, setStatus] = useState<ConnectionStatus>(() =>
    getEnv('VITE_MQTT_WS_URL') ? 'connecting' : 'disconnected',
  )
  const [displayPower, setDisplayPower] = useState<DisplayPower>(null)
  const [brightness, setBrightness] = useState<number | null>(null)
  const [autoSleepEnabled, setAutoSleepEnabled] = useState<boolean | null>(null)
  const [autoSleepTimeoutMinutes, setAutoSleepTimeoutMinutes] =
    useState<AutoSleepTimeoutMinutes | null>(null)
  const [tailscale, setTailscale] = useState<TailscaleStatus | null>(null)
  const [hubStatus, setHubStatus] = useState<HubStatus | null>(null)
  const clientRef = useRef<MqttClient | null>(null)

  // A fresh function every render, so it always reads the current flag; callers that keep it
  // (the shell's settings commands) forward to the latest one.
  const publish = (topic: string, payload: string) => {
    if (demoMode && !topic.startsWith(KIOSK_PREFIX)) return
    clientRef.current?.publish(topic, payload, { qos: 1, retain: false })
  }

  // Not routed through `publish`: the switch itself is the one non-kiosk command demo mode allows.
  // Stable (it only reads the client ref), so the shell's Settings context, which carries it, does
  // not change on every render.
  const setDemoMode = useCallback((next: boolean) => {
    clientRef.current?.publish(TOPIC_DEMO_ENABLED_SET, JSON.stringify(next), {
      qos: 1,
      retain: false,
    })
  }, [])

  useEffect(() => {
    const url = getEnv('VITE_MQTT_WS_URL')
    // No broker configured: the initial status already says disconnected.
    if (!url) return

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
        setTailscale(parseTailscaleStatus(payload))
        return
      }
      if (topic === TOPIC_HUB_STATUS) {
        setHubStatus(parseHubStatus(payload))
        return
      }
      setReal((prev) =>
        applyMessage(prev, topic, payload, ENTITY_PATTERN.real, DEVICE_PATTERN.real),
      )
      setDemo((prev) =>
        applyMessage(prev, topic, payload, ENTITY_PATTERN.demo, DEVICE_PATTERN.demo),
      )
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
      setHubStatus(null)
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
    hubStatus,
    routerHealth: state.devices.router?.health ?? null,
    demoMode,
    setDemoMode,
    publish,
  }
}
