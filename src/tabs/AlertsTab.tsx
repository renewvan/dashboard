import { Bell, CircleAlertIcon, CircleCheckIcon, InfoIcon, TriangleAlertIcon, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '../components/EmptyState'
import { ToastPrimitive, toastManager } from '../components/ui/toast'

// Mirrors `ui/toast.tsx`'s own `TOAST_ICONS` map — kept local rather than a
// shared export since that map isn't exported from the toast module and
// this is the only other consumer of it at this commit.
const SEVERITY_ICONS: Record<string, LucideIcon> = {
  error: CircleAlertIcon,
  info: InfoIcon,
  success: CircleCheckIcon,
  warning: TriangleAlertIcon,
}

const SEVERITY_TEXT_CLASS: Record<string, string> = {
  error: 'text-destructive',
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
}

/**
 * Lists the live toast stack (`toastManager`, `src/components/ui/toast.tsx`)
 * as a persistent, scrollable list rather than only the ephemeral top-right
 * toasts — reached via the header's `AlertsButton`. Not wired into
 * `Sidebar`'s `NAV_ITEMS` (per explicit request); only reachable via the
 * header button or a direct `?tab=alerts` URL (`useUrlTab` in `App.tsx`).
 *
 * Reads the same `toastManager` state the toasts themselves render from —
 * per the alert system's backend-published-state model
 * (`.scratch/alert-system/map.md`, ticket 04), there's no separate
 * "alert history" store here: an alert row exists exactly as long as its
 * toast does, and disappears the same way (backend state clearing, or the
 * `×` dismiss below calling the same `toastManager.close`).
 */
export function AlertsTab() {
  const { toasts } = ToastPrimitive.useToastManager()

  if (toasts.length === 0) {
    return (
      <EmptyState icon={<Bell />} title="No active alerts." description="Alerts will appear here as the hub reports them." />
    )
  }

  return (
    <div className="flex flex-col gap-2" data-testid="alerts-list">
      {toasts.map((toast) => {
        const Icon = (toast.type && SEVERITY_ICONS[toast.type]) || InfoIcon
        const iconClass = (toast.type && SEVERITY_TEXT_CLASS[toast.type]) || 'text-info'
        return (
          <div
            key={toast.id}
            data-testid="alert-row"
            className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/20 px-3.5 py-2.5 backdrop-blur-md"
          >
            <div className="flex items-start gap-2">
              <Icon className={`mt-0.5 size-4 shrink-0 ${iconClass}`} />
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{toast.title}</span>
                {toast.description && <span className="text-muted-foreground text-sm">{toast.description}</span>}
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss alert"
              onClick={() => toastManager.close(toast.id)}
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
