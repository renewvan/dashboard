import { useState } from 'react'
import { Button, Chip } from '@heroui/react'
import { Bell, CircleAlert, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import type { AlertHistoryEntry } from '@/lib/alertHistory'

export interface AlertsPageProps {
  /** The persistent log, newest first (`useAlertHistory`). */
  entries: AlertHistoryEntry[]
  /** Drops one entry from the log: this page's own explicit dismiss, not a toast's close. */
  onRemove: (id: string) => void
  /** Drops several entries at once: Select mode's Delete. */
  onRemoveMany: (ids: string[]) => void
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

/** A row's body: a plain box, or a label in Select mode so the whole row is the checkbox's target. */
function Body({
  as: Tag,
  className,
  children,
}: {
  as: 'div' | 'label'
  className: string
  children: React.ReactNode
}) {
  return <Tag className={className}>{children}</Tag>
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
 * its toast is dismissed or its condition clears, and only this page itself drops it: a row's own
 * remove button, or Select mode (Select, then pick rows or Select all, then Delete), which removes
 * the picked rows together. Every target is 44px, for gloves, and a picked row is the whole row.
 */
export function AlertsPage({ entries, onRemove, onRemoveMany }: AlertsPageProps) {
  const [selecting, setSelecting] = useState(false)
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  // An empty log has no Select mode: leave it, so it is not still on when alerts come back.
  if (entries.length === 0 && selecting) setSelecting(false)
  // Derived from the log, so an alert that has left it (removed elsewhere) is no longer selected.
  const selectedIds = entries.filter((entry) => picked.has(entry.id)).map((entry) => entry.id)
  const allSelected = selectedIds.length === entries.length
  const leaveSelecting = () => {
    setSelecting(false)
    setPicked(new Set())
  }
  const toggle = (id: string) =>
    setPicked((current) => {
      const next = new Set(current)
      if (!next.delete(id)) next.add(id)
      return next
    })

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
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4 max-md:pt-3"
    >
      {selecting ? (
        <div className="bg-background sticky top-0 z-10 flex min-h-11 items-center gap-3 pt-1 pb-2">
          <label className="flex min-h-11 cursor-pointer items-center gap-2 pr-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = selectedIds.length > 0 && !allSelected
              }}
              onChange={() =>
                setPicked(allSelected ? new Set() : new Set(entries.map((e) => e.id)))
              }
              className="accent-accent size-5"
            />
            Select all
          </label>
          <span className="text-muted flex-1 text-sm tabular-nums">
            {selectedIds.length} selected
          </span>
          <Button
            variant="danger"
            isDisabled={selectedIds.length === 0}
            className="min-h-11"
            onPress={() => {
              onRemoveMany(selectedIds)
              leaveSelecting()
            }}
          >
            {`Delete (${selectedIds.length})`}
          </Button>
          <Button variant="ghost" className="min-h-11" onPress={leaveSelecting}>
            Done
          </Button>
        </div>
      ) : (
        <div className="flex justify-end pt-1 pb-2">
          <Button variant="ghost" className="min-h-11" onPress={() => setSelecting(true)}>
            Select
          </Button>
        </div>
      )}
      <ul aria-label="Alert history" className="flex flex-col gap-2">
        {entries.map((entry) => {
          const Icon = SEVERITY_ICON[entry.type]
          const severity = SEVERITY_CLASS[entry.type]
          return (
            <li
              key={entry.id}
              data-resolved={entry.resolvedAt !== undefined}
              data-acknowledged={entry.acknowledgedAt !== undefined}
              className={`bg-surface rounded-2xl border ${severity.border}`}
            >
              <Body
                as={selecting ? 'label' : 'div'}
                className={`flex items-start gap-3 py-3 pr-1 pl-3.5 ${selecting ? 'cursor-pointer' : ''}`}
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
                {selecting ? (
                  <span className="flex size-11 shrink-0 items-center justify-center">
                    <input
                      type="checkbox"
                      aria-label={`Select alert: ${entry.title}`}
                      checked={picked.has(entry.id)}
                      onChange={() => toggle(entry.id)}
                      className="accent-accent size-5"
                    />
                  </span>
                ) : (
                  <Button
                    isIconOnly
                    variant="ghost"
                    aria-label={`Remove alert: ${entry.title}`}
                    className="size-11! min-h-11! min-w-11! shrink-0"
                    onPress={() => onRemove(entry.id)}
                  >
                    <X aria-hidden="true" className="size-5" />
                  </Button>
                )}
              </Body>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
