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
// to the row's own border here instead of a background tint (the row
// already uses a neutral `bg-card/20`, matching every other tab's card
// surface; only the toast goes further and tints its background too).
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
 *   clears — state, not a driver action. Takes priority over the
 *   acknowledge badge once true; a resolved alert has nothing left to
 *   acknowledge.
 * - `Acknowledge` / `Acknowledged` (blue, `variant="info"`) otherwise: an
 *   explicit driver action, independent of resolution. The badge itself
 *   is the tap target — no wrapping `<button>` — via `role="button"`
 *   directly on the `Badge` span, per explicit request.
 *
 * Title/description/timestamp are forced to white-tinted opacity steps
 * (`text-white/90` etc, matching `EmptyState`'s own convention) rather
 * than theme-aware `text-foreground`/`text-muted-foreground`: this card
 * is a translucent `bg-card/20` glass surface sitting directly over the
 * wallpaper photo (`App.tsx`), and light theme's photo is bright enough
 * that theme-aware dark-gray body text lost too much contrast through it.
 */
export function AlertsTab() {
  const { entries, remove, acknowledge } = useAlertHistory()

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
        const acknowledged = entry.acknowledgedAt !== undefined
        return (
          <div
            key={entry.id}
            data-testid="alert-row"
            data-resolved={resolved}
            data-acknowledged={acknowledged}
            className={`flex items-start justify-between gap-3 rounded-lg border bg-card/20 px-3.5 py-2.5 backdrop-blur-md ${SEVERITY_BORDER_CLASS[entry.type]}`}
          >
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
              
              <div className="flex flex-col gap-1">
                <span className="font-medium text-white/90">{entry.title}</span>
                 {resolved ? (
                  <Badge variant="success" size="sm" className="w-fit">
                    Resolved
                  </Badge>
                ) : (
                  <Badge
                    variant="info"
                    size="sm"
                    className="w-fit cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-pressed={acknowledged}
                    onClick={() => !acknowledged && acknowledge(entry.id)}
                    onKeyDown={(event) => {
                      if (!acknowledged && (event.key === 'Enter' || event.key === ' ')) acknowledge(entry.id)
                    }}
                  >
                    {acknowledged ? 'Acknowledged' : 'Acknowledge'}
                  </Badge>
                )}
                <p className="line-clamp-2 text-sm text-white/70">{entry.description}</p>
               
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button
                type="button"
                aria-label="Remove alert"
                onClick={() => remove(entry.id)}
                className="rounded p-0.5 text-white/70 opacity-70 hover:opacity-100"
              >
                <X className="size-4" />
              </button>
              <span className="text-xs text-white/50 tabular-nums" data-testid="alert-row-timestamp">
                {formatTimestamp(entry.createdAt)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
