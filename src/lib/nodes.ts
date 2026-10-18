import type { NodeInfo, RenewvanBusState } from '@/types'

/**
 * Settings → Nodes, derived from the bus: one row per **Node** (a device that publishes onto the
 * bus, identified by its `renewvan/<node>/info|health` topics), plus a **fallback row** per entity
 * type that no Node claims, so a partial rollout never leaves Settings blank. This is the one
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

/** In the display order fallback rows keep (the order the Nodes list always used). */
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

/** How a Node's dot reads: green, grey (offline or health unknown), or amber (no info). */
export type NodeTone = 'ok' | 'offline' | 'unknown'
export type NodeStatus = 'Online' | 'Offline' | 'Unknown'

export interface NodeRow {
  /** The Node's `<node>` topic segment, or `domain:<entity type>` for a fallback row. */
  key: string
  /** The product name, else the Node's key, else (a fallback row) the entity type's old label. */
  label: string
  tone: NodeTone
  status: NodeStatus
  /** What the Firmware version row shows; the same wording on the Nodes and Firmware pages. */
  version: string
  /** The Node's retained info, absent for a Node with none and for every fallback row. */
  info: NodeInfo | undefined
  /** Entity types this row exposes, each with the ids currently on the bus. */
  entities: Array<{ type: EntityType; label: string; ids: string[] }>
  /** How many entities the row exposes; `null` for a Node with no info, whose `publishes` is unknown. */
  entityCount: number | null
  /** Offline with info: the whole page renders greyed. */
  dim: boolean
}

function entitiesOf(state: RenewvanBusState, types: readonly string[]): NodeRow['entities'] {
  return ENTITY_TYPES.filter(({ type }) => types.includes(type))
    .map(({ type, field, label }) => ({ type, label, ids: Object.keys(state[field]) }))
    .filter(({ ids }) => ids.length > 0)
}

function describeNode(
  info: NodeInfo | undefined,
  health: 'online' | 'offline' | undefined,
): Pick<NodeRow, 'tone' | 'status' | 'version' | 'dim'> {
  if (info === undefined) {
    if (health === 'offline') {
      return { tone: 'offline', status: 'Offline', version: 'Unknown', dim: false }
    }
    // Online without info is the amber "update the node" case; no health either (a fallback row)
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
 * One row per Node, by key, then one fallback row per entity type with entities that no Node
 * claims by its `publishes` list. Two Nodes publishing the same type both show the same
 * instances: per-instance attribution is out of scope.
 */
export function nodeRows(state: RenewvanBusState): NodeRow[] {
  const claimed = new Set<string>()
  const rows: NodeRow[] = Object.keys(state.nodes)
    .sort()
    .map((key) => {
      const { info, health } = state.nodes[key]
      for (const type of info?.publishes ?? []) claimed.add(type)
      const entities = entitiesOf(state, info?.publishes ?? [])
      return {
        key,
        label: info?.product ?? key,
        info,
        entities,
        // Without info there is no `publishes`, so how many entities it owns is unknown, not zero.
        entityCount: info === undefined ? null : entities.reduce((sum, e) => sum + e.ids.length, 0),
        ...describeNode(info, health),
      }
    })

  for (const { type, field, label } of ENTITY_TYPES) {
    if (claimed.has(type)) continue
    const ids = Object.keys(state[field])
    if (ids.length === 0) continue
    rows.push({
      key: `${FALLBACK_PREFIX}${type}`,
      label,
      info: undefined,
      entities: [{ type, label, ids }],
      entityCount: ids.length,
      ...describeNode(undefined, undefined),
    })
  }
  return rows
}

/** Headline for the Settings → Nodes group row, e.g. `3 nodes`. */
export function nodesSummary(rows: Pick<NodeRow, 'key'>[]): string {
  if (rows.length === 0) return 'No nodes connected'
  return rows.length === 1 ? '1 node' : `${rows.length} nodes`
}
