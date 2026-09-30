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

// Mirrors `ui/toast.tsx`'s own `data-[type=…]:border-*` severity tint on
// the toast root — same "which alert is this" signal at a glance, applied
// to the row's own border here too.
const SEVERITY_BORDER_CLASS: Record<AlertHistoryEntry['type'], string> = {
  error: 'border-destructive',
  warning: 'border-warning',
}

function formatTimestamp(ms: number): string {
  const date = new Date(ms)
  const datePart = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${datePart}, ${hours}:${minutes}`
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
 * below), independent of a toast's ephemeral lifecycle.
 *
 * One status badge per row (not both at once), both the codebase's
 * low-opacity "tint" badge variants — translucent, not a solid fill; see
 * `ui/badge.tsx` — rather than a solid `destructive`/`default` fill:
 * - `Resolved` (green, `variant="success"`): `resolvedAt`, set by
 *   `useAlertToasts.ts` once the backend condition that raised the alert
 *   clears. Takes priority — a resolved alert has nothing left to
 *   acknowledge.
 * - `Acknowledged` (blue, `variant="info"`) otherwise, once set:
 *   `acknowledgedAt` means the driver dismissed the toast early (its own
 *   `×`) while the alert was still open — `useAlertToasts.ts` sets it
 *   from the toast's `onClose` callback, not a click anywhere in this
 *   tab. Purely a display badge here, not an in-tab action: there's
 *   nothing to tap — acknowledging already happened at the toast.
 *
 * Wrapped in the same full-panel glass container every other tab uses
 * (`rounded-2xl border border-white/10 bg-card/40 backdrop-blur-md`,
 * matching `App.tsx`'s header and `de21ed0`'s original "main glass
 * container" treatment) rather than each row floating bare on the
 * wallpaper — that's what makes theme-aware `text-muted-foreground` body
 * text legible in light theme too: it's read against this panel's own
 * `bg-card/40`, not the raw photo behind it.
 */
export function AlertsTab() {
  const { entries, remove } = useAlertHistory()

  if (entries.length === 0) {
    return (
      <EmptyState icon={<Bell />} title="Well done, no active alerts!" description="Alerts will appear here as the hub reports them." />
    )
  }

  return (
    <div className="flex flex-1 flex-col h-full overflow-y-auto rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-md">
      <div className="flex flex-col gap-2" data-testid="alerts-list">
        {entries.map((entry) => {
          const Icon = SEVERITY_ICONS[entry.type]
          const iconClass = SEVERITY_TEXT_CLASS[entry.type]
          const resolved = entry.resolvedAt !== undefined
          const acknowledged = entry.acknowledgedAt !== undefined
          return (
            <div
              key={entry.id}
              data-testid="alert-row"
              data-resolved={resolved}
              data-acknowledged={acknowledged}
              className={`flex items-start justify-between gap-3 rounded-lg border px-3.5 py-2.5 backdrop-blur-md ${SEVERITY_BORDER_CLASS[entry.type]}`}
            >
              <div className="flex items-start gap-2">
                <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
                
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{entry.title}</span>
                  <p className="line-clamp-2 text-sm text-muted-foreground/90">{entry.description}</p>
                </div>
              </div>
              
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <div className="flex items-start gap-3">
                  {resolved ? (
                    <Badge variant="success" size="sm" className="w-fit">
                      Resolved
                    </Badge>
                  ) : acknowledged ? (
                    <Badge variant="info" size="sm" className="w-fit">
                      Acknowledged
                    </Badge>
                  ) : null}
                <button
                  type="button"
                  aria-label="Remove alert"
                  onClick={() => remove(entry.id)}
                  className="rounded p-0.5 text-destructive opacity-70 hover:opacity-100"
                >
                  <X className="size-4" />
                </button>
                </div>
                <span className="text-xs text-muted-foreground/90 tabular-nums font-semibold" data-testid="alert-row-timestamp">
                  {formatTimestamp(entry.createdAt)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
