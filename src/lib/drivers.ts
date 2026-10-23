import type { DriverInfo, RenewvanBusState } from '@/types'

/**
 * Settings → Drivers, derived from the bus: one row per **Driver** (anything that publishes onto the
 * bus, identified by its `renewvan/<driver>/info|health` topics), plus a **fallback row** per entity
 * type that no Driver claims, so a partial rollout never leaves Settings blank. This is the one
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

/** In the display order fallback rows keep (the order the Drivers list always used). */
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

/** How a Driver's dot reads: green, grey (offline or health unknown), or amber (no info). */
export type DriverTone = 'ok' | 'offline' | 'unknown'
export type DriverStatus = 'Online' | 'Offline' | 'Unknown'

export interface DriverRow {
  /** The Driver's `<driver>` topic segment, or `domain:<entity type>` for a fallback row. */
  key: string
  /** The Driver's name as a title: its `<driver>` key capitalised (`tank` → `Tank`); a fallback row's entity label. */
  name: string
  tone: DriverTone
  status: DriverStatus
  /** What the Firmware version row shows; the same wording on the Drivers and Firmware pages. */
  version: string
  /** The Driver's retained info, absent for a Driver with none and for every fallback row. */
  info: DriverInfo | undefined
  /** Entity types this row exposes, each with the ids currently on the bus. */
  entities: Array<{ type: EntityType; label: string; ids: string[] }>
  /** How many entities the row exposes; `null` for a Driver with no info, whose `publishes` is unknown. */
  entityCount: number | null
  /** Offline with info: the whole page renders greyed. */
  dim: boolean
}

/** Words in a Driver key that are acronyms or model names, shown upper-case instead of capitalised. */
const KEY_ACRONYMS: Record<string, true> = { gps: true, esp32: true }

/** `esp32-16x-relay` → `ESP32 16x Relay`: the key's hyphen-separated words, each capitalised. */
function driverName(key: string): string {
  return key
    .split('-')
    .map((word) =>
      Object.hasOwn(KEY_ACRONYMS, word.toLowerCase())
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

/** One entity instance and the Driver key it names, if any (`renewvan/<entity>/<id>/driver`). */
interface Instance {
  id: string
  driver: string | undefined
}

function instancesOf(state: RenewvanBusState, field: EntityField): Instance[] {
  const records: Record<string, { driver?: string }> = state[field]
  return Object.entries(records).map(([id, record]) => ({ id, driver: record.driver }))
}

/** The entity types of the instances `keep` accepts, each with the ids currently on the bus. */
function entitiesWhere(
  state: RenewvanBusState,
  keep: (instance: Instance, type: EntityType) => boolean,
): DriverRow['entities'] {
  return ENTITY_TYPES.map(({ type, field, label }) => ({
    type,
    label,
    ids: instancesOf(state, field)
      .filter((instance) => keep(instance, type))
      .map(({ id }) => id),
  })).filter(({ ids }) => ids.length > 0)
}

function describeDriver(
  info: DriverInfo | undefined,
  health: 'online' | 'offline' | undefined,
): Pick<DriverRow, 'tone' | 'status' | 'version' | 'dim'> {
  if (info === undefined) {
    if (health === 'offline') {
      return { tone: 'offline', status: 'Offline', version: 'Unknown', dim: false }
    }
    // Online without info is the amber "update the driver" case; no health either (a fallback row)
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
 * One row per Driver, then one fallback row per entity type with instances no Driver owns, the
 * whole list in alphabetical order of the name it is shown under.
 *
 * An instance belongs to the Driver its own `driver` property names. An instance with no `driver`
 * (a legacy publisher) belongs, as before, to every Driver whose info `publishes` its type. An
 * instance whose `driver` is not a Driver on the bus, or a legacy one that no Driver publishes,
 * lands in the fallback row of its type. A Driver's `entities` and `entityCount` count only the
 * instances attributed to it; with no info its `publishes` is unknown, so its count is `null`.
 */
export function driverRows(state: RenewvanBusState): DriverRow[] {
  const published = new Set<string>()
  const rows: DriverRow[] = Object.keys(state.drivers).map((key) => {
    const { info, health } = state.drivers[key]
    const publishes = info?.publishes ?? []
    for (const type of publishes) published.add(type)
    const entities = entitiesWhere(
      state,
      ({ driver }, type) => driver === key || (driver === undefined && publishes.includes(type)),
    )
    return {
      key,
      name: driverName(info?.driver ?? key),
      info,
      entities,
      // Without info there is no `publishes`, so how many entities it owns is unknown, not zero.
      entityCount: info === undefined ? null : entities.reduce((sum, e) => sum + e.ids.length, 0),
      ...describeDriver(info, health),
    }
  })

  const orphans = entitiesWhere(state, ({ driver }, type) =>
    driver === undefined ? !published.has(type) : !Object.hasOwn(state.drivers, driver),
  )
  for (const { type, label, ids } of orphans) {
    rows.push({
      key: `${FALLBACK_PREFIX}${type}`,
      name: label,
      info: undefined,
      entities: [{ type, label, ids }],
      entityCount: ids.length,
      ...describeDriver(undefined, undefined),
    })
  }
  // By the name on screen, not the key behind it (`esp32-16x-relay` reads "ESP32 16x Relay"); case and accents do
  // not matter. Of two rows under one name (a Driver and the fallback for what it leaves unclaimed)
  // the Driver comes first, and the key settles any other tie, so the order never flips.
  const isFallback = (row: DriverRow) => row.key.startsWith(FALLBACK_PREFIX)
  return rows.sort(
    (a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) ||
      Number(isFallback(a)) - Number(isFallback(b)) ||
      (a.key < b.key ? -1 : 1),
  )
}

const INSTANCE_NOUNS: Record<'battery' | 'solar' | 'charger', [one: string, many: string]> = {
  battery: ['battery', 'batteries'],
  solar: ['solar controller', 'solar controllers'],
  charger: ['charger', 'chargers'],
}

/** `1 battery` / `2 batteries`: the count on a Driver page's row for a type the instances view lists. */
export function instanceCountText(type: keyof typeof INSTANCE_NOUNS, count: number): string {
  const [one, many] = INSTANCE_NOUNS[type]
  return `${count} ${count === 1 ? one : many}`
}

/** `1 entity` / `N entities`: the one wording for an entity count on the Drivers list and Driver page. */
export function entityCountText(count: number): string {
  return count === 1 ? '1 entity' : `${count} entities`
}

/** Headline for the Settings → Drivers group row, e.g. `3 drivers`. */
export function driversSummary(rows: Pick<DriverRow, 'key'>[]): string {
  if (rows.length === 0) return 'No drivers connected'
  return rows.length === 1 ? '1 driver' : `${rows.length} drivers`
}

/**
 * Whether relay `state` can be trusted: every Driver whose info says it publishes `relay` is
 * `online`. A relay's state is retained and a will cannot clear sixteen topics, so a dead Driver
 * leaves a stale "on" behind; no relay Driver at all, an `offline` one, or one with info but no
 * health (half-started) all read as not trusted. The join is by what the Driver publishes, not by
 * which instances name it (a relay's trust is a property of the type, hub ADR 0013).
 */
export function relayDriversOnline(state: Pick<RenewvanBusState, 'drivers'>): boolean {
  const relayDrivers = Object.values(state.drivers).filter((n) =>
    n.info?.publishes?.includes('relay'),
  )
  return relayDrivers.length > 0 && relayDrivers.every((n) => n.health === 'online')
}

/**
 * Whether the tilt angles are known to be dead: a Driver whose info says it publishes `tilt` is
 * `offline`. The angles are retained, and a last will cannot clear them, so a driver that dies
 * leaves its last `status: ok` and last angles on the broker for ever, indistinguishable from a
 * live reading; the Driver's health is the only thing that says the driver is gone.
 *
 * Unlike `relayDriversOnline` this reads only positive evidence of failure, not the absence of
 * proof of life. A van whose tilt driver predates Driver info, or one with no Driver record yet
 * (health arrives after the retained angles), still has a working tilt, so unknown health, no
 * Driver and an online one all read as not dead. Joined by what the Driver publishes, like `relayDriversOnline`.
 */
export function tiltDriversOffline(state: Pick<RenewvanBusState, 'drivers'>): boolean {
  return Object.values(state.drivers).some(
    (n) => n.info?.publishes?.includes('tilt') && n.health === 'offline',
  )
}
