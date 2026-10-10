import { useSettings } from './SettingsContext'

/** Every node that has published, with how many entities it exposes. */
export function NodesView() {
  const { nodes } = useSettings()

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
      {nodes.map((node) => (
        <li key={node.domain} className="flex items-center justify-between gap-3 px-3.5 py-3">
          <span className="text-sm font-medium">{node.label}</span>
          <span className="text-muted text-xs tabular-nums">
            {node.count === 1 ? '1 entity' : `${node.count} entities`}
          </span>
        </li>
      ))}
    </ul>
  )
}
