import type { DeviceInfo, RenewvanBusState } from '@/types'

/**
 * Settings → Devices, derived from the bus: one row per **Device** (anything that publishes onto the
 * bus, identified by its `renewvan/<device>/info|health` topics), plus a **fallback row** per entity
 * type that no Device claims, so a partial rollout never leaves Settings blank. This is the one
 * place that maps entity types to their bus state field and old label.
 */
export type EntityType =
  | 'tank'
  | 'battery'
  | 'solar'
  | 'charger'
  | 'relay'
  | 'router'
  | 'gps'
  | 'temperature'
  | 'tilt'

type EntityField = keyof Pick<
  RenewvanBusState,
  | 'tanks'
  | 'batteries'
  | 'solar'
  | 'chargers'
  | 'relays'
  | 'routers'
  | 'gps'
  | 'temperatures'
  | 'tilt'
>

/** In the display order fallback rows keep (the order the Devices list always used). */
const ENTITY_TYPES: Array<{ type: EntityType; field: EntityField; label: string }> = [
  { type: 'tank', field: 'tanks', label: 'Tanks' },
  { type: 'battery', field: 'batteries', label: 'Batteries' },
  { type: 'solar', field: 'solar', label: 'Solar' },
  { type: 'charger', field: 'chargers', label: 'Chargers' },
  { type: 'relay', field: 'relays', label: 'Relays' },
  { type: 'router', field: 'routers', label: 'Router' },
  { type: 'gps', field: 'gps', label: 'GPS' },
  { type: 'temperature', field: 'temperatures', label: 'Temperature' },
  { type: 'tilt', field: 'tilt', label: 'Tilt' },
]

const FALLBACK_PREFIX = 'domain:'

/** How a Device's dot reads: green, grey (offline or health unknown), or amber (no info). */
export type DeviceTone = 'ok' | 'offline' | 'unknown'
export type DeviceStatus = 'Online' | 'Offline' | 'Unknown'

export interface DeviceRow {
  /** The Device's `<device>` topic segment, or `domain:<entity type>` for a fallback row. */
  key: string
  /** The Device's name as a title: its `<device>` key capitalised (`tank` → `Tank`); a fallback row's entity label. */
  name: string
  tone: DeviceTone
  status: DeviceStatus
  /** What the Firmware version row shows; the same wording on the Devices and Firmware pages. */
  version: string
  /** The Device's retained info, absent for a Device with none and for every fallback row. */
  info: DeviceInfo | undefined
  /** Entity types this row exposes, each with the ids currently on the bus. */
  entities: Array<{ type: EntityType; label: string; ids: string[] }>
  /** How many entities the row exposes; `null` for a Device with no info, whose `publishes` is unknown. */
  entityCount: number | null
  /** Offline with info: the whole page renders greyed. */
  dim: boolean
}

/** Device keys whose name is not just the key capitalised (acronyms, and a key that names a board). */
const DEVICE_NAMES: Record<string, string> = { gps: 'GPS', 'esp32-relay': 'Relays' }

function deviceName(key: string): string {
  return DEVICE_NAMES[key.toLowerCase()] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

function entitiesOf(state: RenewvanBusState, types: readonly string[]): DeviceRow['entities'] {
  return ENTITY_TYPES.filter(({ type }) => types.includes(type))
    .map(({ type, field, label }) => ({ type, label, ids: Object.keys(state[field]) }))
    .filter(({ ids }) => ids.length > 0)
}

function describeDevice(
  info: DeviceInfo | undefined,
  health: 'online' | 'offline' | undefined,
): Pick<DeviceRow, 'tone' | 'status' | 'version' | 'dim'> {
  if (info === undefined) {
    if (health === 'offline') {
      return { tone: 'offline', status: 'Offline', version: 'Unknown', dim: false }
    }
    // Online without info is the amber "update the device" case; no health either (a fallback row)
    // reads Unknown.
    const status = health === 'online' ? 'Online' : 'Unknown'
    return { tone: 'unknown', status, version: 'Unknown', dim: false }
  }
  if (health === 'offline') {
    return {
      tone: 'offline',
      status: 'Offline',
      version: `offline, last seen ${info.version}`,
      dim: true,
    }
  }
  if (health === 'online')
    return { tone: 'ok', status: 'Online', version: info.version, dim: false }
  // Info but no health: neither online nor offline, and the version is still known.
  return { tone: 'offline', status: 'Unknown', version: info.version, dim: false }
}

/**
 * One row per Device, then one fallback row per entity type with entities that no Device claims by
 * its `publishes` list, the whole list in alphabetical order of the name it is shown under. Two
 * Devices publishing the same type both show the same instances: per-instance attribution is out of
 * scope.
 */
export function deviceRows(state: RenewvanBusState): DeviceRow[] {
  const claimed = new Set<string>()
  const rows: DeviceRow[] = Object.keys(state.devices).map((key) => {
    const { info, health } = state.devices[key]
    for (const type of info?.publishes ?? []) claimed.add(type)
    const entities = entitiesOf(state, info?.publishes ?? [])
    return {
      key,
      name: deviceName(info?.device ?? key),
      info,
      entities,
      // Without info there is no `publishes`, so how many entities it owns is unknown, not zero.
      entityCount: info === undefined ? null : entities.reduce((sum, e) => sum + e.ids.length, 0),
      ...describeDevice(info, health),
    }
  })

  for (const { type, field, label } of ENTITY_TYPES) {
    if (claimed.has(type)) continue
    const ids = Object.keys(state[field])
    if (ids.length === 0) continue
    rows.push({
      key: `${FALLBACK_PREFIX}${type}`,
      name: label,
      info: undefined,
      entities: [{ type, label, ids }],
      entityCount: ids.length,
      ...describeDevice(undefined, undefined),
    })
  }
  // By the name on screen, not the key behind it (`esp32-relay` reads "Relays"); case and accents do
  // not matter. Of two rows under one name (a Device and the fallback for what it leaves unclaimed)
  // the Device comes first, and the key settles any other tie, so the order never flips.
  const isFallback = (row: DeviceRow) => row.key.startsWith(FALLBACK_PREFIX)
  return rows.sort(
    (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
      Number(isFallback(a)) - Number(isFallback(b)) ||
      (a.key < b.key ? -1 : 1),
  )
}

/** `1 entity` / `N entities`: the one wording for an entity count on the Devices list and Device page. */
export function entityCountText(count: number): string {
  return count === 1 ? '1 entity' : `${count} entities`
}

/** Headline for the Settings → Devices group row, e.g. `3 devices`. */
export function devicesSummary(rows: Pick<DeviceRow, 'key'>[]): string {
  if (rows.length === 0) return 'No devices connected'
  return rows.length === 1 ? '1 device' : `${rows.length} devices`
}

/**
 * Whether relay `state` can be trusted: every Device whose info says it publishes `relay` is
 * `online`. A relay's state is retained and a will cannot clear sixteen topics, so a dead Device
 * leaves a stale "on" behind; no relay Device at all, an `offline` one, or one with info but no
 * health (half-started) all read as not trusted. The join is by what the Device publishes, with the
 * same per-instance limit as `deviceRows` (hub ADR 0013).
 */
export function relayDevicesOnline(state: Pick<RenewvanBusState, 'devices'>): boolean {
  const relayDevices = Object.values(state.devices).filter((n) =>
    n.info?.publishes?.includes('relay'),
  )
  return relayDevices.length > 0 && relayDevices.every((n) => n.health === 'online')
}
