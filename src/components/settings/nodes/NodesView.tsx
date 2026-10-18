import type { NodeRow } from '@/lib/nodes'
import { GroupRow } from '../shared/GroupRow'
import { useSettings } from '../SettingsContext'
import { NODE_TONE } from './nodeTone'

function entities(count: number): string {
  return count === 1 ? '1 entity' : `${count} entities`
}

/**
 * `<version> · <N entities>`: the one-line state of a Node. A Node with no info has no known
 * entity count (its `publishes` is unknown), so it reads as its version alone. The Host serial is
 * never shown here.
 */
function describe(row: NodeRow): string {
  return row.entityCount === null ? row.version : `${row.version} · ${entities(row.entityCount)}`
}

/**
 * Every Node on the van, one row each (never one per entity type), with a status dot, its version
 * and how many entities it publishes. A row opens the Node's Device page. Entities that no Node
 * claims appear as a fallback row by entity type, so a partial rollout never leaves it blank.
 */
export function NodesView({ onOpen }: { onOpen: (key: string) => void }) {
  const { nodes } = useSettings()

  if (nodes.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No nodes connected. Waiting for the renewvan hub.
      </p>
    )
  }

  return (
    <ul aria-label="Published nodes" className="flex flex-col gap-2">
      {nodes.map((row) => (
        <li key={row.key} className={row.dim ? 'opacity-60' : ''}>
          <GroupRow
            label={row.label}
            description={describe(row)}
            statusTone={NODE_TONE[row.tone]}
            onOpen={() => onOpen(row.key)}
          />
        </li>
      ))}
    </ul>
  )
}
