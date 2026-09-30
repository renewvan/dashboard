import { Bell } from 'lucide-react'
import { Badge } from './ui/badge'
import { ToastPrimitive } from './ui/toast'

export interface AlertInfoIconProps {
  /** Navigates to the "Alerts" tab (`App.tsx`) — not a popover like `IconStatusButton`, per explicit request. */
  onClick: () => void
}

/**
 * Header alert bell — a real *action* button (`CONTEXT.md`'s distinction
 * from a *status* button): tapping it navigates to the "Alerts" tab
 * rather than opening a popover in place, so it's styled like
 * `ThemeToggleButton`/`DisplayPowerButton` (opaque `bg-foreground/10`
 * circle), not `IconStatusButton`'s transparent trigger.
 *
 * The badge count comes straight from `toastManager`'s live toast list
 * (`useAlertToasts` is what actually adds/removes those toasts as the
 * backend-published alert state changes, per
 * `.scratch/alert-system/map.md`) rather than a separate alert store —
 * the toast stack *is* the current set of active alerts, so the header
 * badge and the Alerts tab's list (`AlertsTab.tsx`) both read it
 * directly instead of duplicating that state.
 */
export function AlertInfoIcon({ onClick }: AlertInfoIconProps) {
  const { toasts } = ToastPrimitive.useToastManager()
  const count = toasts.length

  return (
    <button
      type="button"
      aria-label={count > 0 ? `Alerts, ${count} active` : 'Alerts'}
      title="Alerts"
      data-testid="alert-info-icon"
      onClick={onClick}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/16"
    >
      <Bell className="size-5" />
      {count > 0 && (
        <Badge
          variant="destructive"
          size="sm"
          className="absolute top-0.5 right-0.5"
          data-testid="alert-info-icon-badge"
        >
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </button>
  )
}
