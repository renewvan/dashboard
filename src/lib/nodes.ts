import type { RenewvanBusState } from '@/types'

/**
 * The bus has no node registry: a "connected device" is any entity id that
 * has published under a domain topic (`renewvan/<domain>/<id>/*`). This is
 * the one place that maps domains to the node that publishes them, so the
 * Settings → Nodes list can't drift from the bus state shape.
 */
export interface NodeSummary {
  /** Stable key — the `RenewvanBusState` domain this node publishes. */
  domain: keyof Pick<
    RenewvanBusState,
    'tanks' | 'batteries' | 'relays' | 'routers' | 'gps' | 'temperatures' | 'tilt'
  >
  label: string
  /** Entity ids currently present on the bus for this node. */
  count: number
}

const NODE_DOMAINS: Array<Pick<NodeSummary, 'domain' | 'label'>> = [
  { domain: 'tanks', label: 'Tanks' },
  { domain: 'batteries', label: 'Batteries' },
  { domain: 'relays', label: 'Relays' },
  { domain: 'routers', label: 'Router' },
  { domain: 'gps', label: 'GPS' },
  { domain: 'temperatures', label: 'Temperature' },
  { domain: 'tilt', label: 'Tilt' },
]

/** Nodes that have published at least one entity, in stable display order. */
export function connectedNodes(state: RenewvanBusState): NodeSummary[] {
  return NODE_DOMAINS.map(({ domain, label }) => ({
    domain,
    label,
    count: Object.keys(state[domain]).length,
  })).filter((node) => node.count > 0)
}

/** Headline for the Settings → Nodes group row, e.g. `3 nodes`. */
export function nodesSummary(nodes: NodeSummary[]): string {
  if (nodes.length === 0) return 'No nodes connected'
  return nodes.length === 1 ? '1 node' : `${nodes.length} nodes`
}
