import { Button, Chip } from '@heroui/react'
import { Bell, CircleAlert, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { AlertHistoryEntry } from '@/lib/alertHistory'

export interface AlertsPageProps {
  /** The persistent log, newest first (`useAlertHistory`). */
  entries: AlertHistoryEntry[]
  /** Drops one entry from the log: this page's own explicit dismiss, not a toast's close. */
  onRemove: (id: string) => void
}

const SEVERITY_ICON: Record<AlertHistoryEntry['type'], LucideIcon> = {
  error: CircleAlert,
  warning: TriangleAlert,
}

/** The row's border and icon follow the toast's own type colour (`index.css`). */
const SEVERITY_CLASS: Record<AlertHistoryEntry['type'], { border: string; icon: string }> = {
  error: { border: 'border-danger/40', icon: 'text-danger' },
  warning: { border: 'border-warning/40', icon: 'text-warning' },
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${day}, ${hours}:${minutes}`
}

/**
 * One status per row, never both: Resolved (the backend condition cleared) wins, because a
 * resolved alert has nothing left to acknowledge; Acknowledged means the driver dismissed the
 * toast while the alert was still open. Both are display only: acknowledging already happened
 * at the toast. The word is in the chip, so colour is never the only cue.
 */
function StatusChip({ entry }: { entry: AlertHistoryEntry }) {
  if (entry.resolvedAt !== undefined) {
    return (
      <Chip size="sm" variant="soft" color="success">
        Resolved
      </Chip>
    )
  }
  if (entry.acknowledgedAt !== undefined) {
    return (
      <Chip size="sm" variant="soft" color="accent">
        Acknowledged
      </Chip>
    )
  }
  return null
}

/**
 * The Alerts page, reached from the header bell (`?page=alerts`): the persistent alert log, one
 * row per alert, newest first. It is deliberately not the live toast stack: a row stays after
 * its toast is dismissed or its condition clears, and only this page's own remove button (a
 * 44px target, for gloves) drops it.
 */
export function AlertsPage({ entries, onRemove }: AlertsPageProps) {
  if (entries.length === 0) {
    return (
      <section
        aria-label="Alerts"
        data-testid="pane-alerts"
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center"
      >
        <Bell aria-hidden="true" className="text-muted size-5" />
        <h2 className="text-foreground text-lg font-semibold">Well done, no active alerts!</h2>
        <p className="text-muted text-sm">Alerts will appear here as the hub reports them.</p>
      </section>
    )
  }

  return (
    <section
      aria-label="Alerts"
      data-testid="pane-alerts"
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4"
    >
      <ul aria-label="Alert history" className="flex flex-col gap-2">
        {entries.map((entry) => {
          const Icon = SEVERITY_ICON[entry.type]
          const severity = SEVERITY_CLASS[entry.type]
          return (
            <li
              key={entry.id}
              data-resolved={entry.resolvedAt !== undefined}
              data-acknowledged={entry.acknowledgedAt !== undefined}
              className={`bg-surface flex items-start gap-3 rounded-2xl border py-3 pr-1 pl-3.5 ${severity.border}`}
            >
              <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${severity.icon}`} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="text-sm font-medium">{entry.title}</span>
                <p className="text-muted line-clamp-2 text-sm">{entry.description}</p>
                <div className="flex items-center gap-2">
                  <time
                    dateTime={new Date(entry.createdAt).toISOString()}
                    className="text-muted text-xs font-semibold tabular-nums"
                  >
                    {formatTimestamp(entry.createdAt)}
                  </time>
                  <StatusChip entry={entry} />
                </div>
              </div>
              <Button
                isIconOnly
                variant="ghost"
                aria-label={`Remove alert: ${entry.title}`}
                className="size-11! min-h-11! min-w-11! shrink-0"
                onPress={() => onRemove(entry.id)}
              >
                <X aria-hidden="true" className="size-5" />
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
