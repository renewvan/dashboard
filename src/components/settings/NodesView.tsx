import { temperatureSummary } from '@/lib/temperature'
import { GroupRow } from './GroupRow'
import { useSettings } from './SettingsContext'
import type { SettingsSubView } from './views'

/**
 * Every node that has published, with how many entities it exposes. Temperature
 * is the only drill-in (its sensors are editable); the rest are read-only.
 */
export function NodesView({ onOpen }: { onOpen: (view: SettingsSubView) => void }) {
  const { nodes, temperatures } = useSettings()

  if (nodes.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No nodes connected. Waiting for the renewvan hub.
      </p>
    )
  }

  return (
    <ul
      aria-label="Published nodes"
      className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border"
    >
      {nodes.map((node) =>
        node.domain === 'temperatures' ? (
          <li key={node.domain}>
            <GroupRow
              label={node.label}
              description={temperatureSummary(temperatures)}
              onOpen={() => onOpen('temperature')}
            />
          </li>
        ) : (
          <li key={node.domain} className="flex items-center justify-between gap-3 px-3.5 py-3">
            <span className="text-sm font-medium">{node.label}</span>
            <span className="text-muted text-xs tabular-nums">
              {node.count === 1 ? '1 entity' : `${node.count} entities`}
            </span>
          </li>
        ),
      )}
    </ul>
  )
}
