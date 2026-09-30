import { Bell, CircleAlertIcon, TriangleAlertIcon, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { EmptyState } from '../components/EmptyState'
import { useAlertHistory } from '../hooks/useAlertHistory'
import type { AlertHistoryEntry } from '../lib/alertHistory'

const SEVERITY_ICONS: Record<AlertHistoryEntry['type'], LucideIcon> = {
  error: CircleAlertIcon,
  warning: TriangleAlertIcon,
}

const SEVERITY_TEXT_CLASS: Record<AlertHistoryEntry['type'], string> = {
  error: 'text-destructive',
  warning: 'text-warning',
}

/**
 * Lists the persistent alert log (`lib/alertHistory.ts`, `localStorage`-
 * backed), reached via the header's `AlertsButton`. Not wired into
 * `Sidebar`'s `NAV_ITEMS` (per explicit request); only reachable via the
 * header button or a direct `?tab=alerts` URL (`useUrlTab` in `App.tsx`).
 *
 * Deliberately *not* the live `toastManager` stack: an earlier version
 * read straight off `toasts`, so dismissing a toast (or the backend
 * condition clearing) made the row vanish from here too — per explicit
 * request, this tab now has its own durable record that only grows via
 * `useAlertToasts.ts` and only shrinks via this tab's own `×` (`remove`
 * below), independent of a toast's ephemeral lifecycle. A `Resolved`
 * badge (driven by `resolvedAt`, set when `useAlertToasts.ts` closes the
 * matching toast) distinguishes past alerts from ones still open,
 * without removing either from the list.
 */
export function AlertsTab() {
  const { entries, remove } = useAlertHistory()

  if (entries.length === 0) {
    return (
      <EmptyState icon={<Bell />} title="Well done, no active alerts!" description="Alerts will appear here as the hub reports them." />
    )
  }

  return (
    <div className="flex flex-col gap-2" data-testid="alerts-list">
      {entries.map((entry) => {
        const Icon = SEVERITY_ICONS[entry.type]
        const iconClass = SEVERITY_TEXT_CLASS[entry.type]
        const resolved = entry.resolvedAt !== undefined
        return (
          <div
            key={entry.id}
            data-testid="alert-row"
            data-resolved={resolved}
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/20 px-3.5 py-2.5 backdrop-blur-md"
          >
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{entry.title}</span>
                  {resolved && (
                    <Badge variant="outline" size="sm">
                      Resolved
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground text-sm">{entry.description}</span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Remove alert"
              onClick={() => remove(entry.id)}
              className="shrink-0 rounded p-0.5 text-muted-foreground opacity-70 hover:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
