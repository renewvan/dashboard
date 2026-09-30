import { Bell } from 'lucide-react'
import { Badge } from './ui/badge'

export interface AlertsButtonProps {
  /** Navigates to the "Alerts" tab (`App.tsx`) — not a popover like `IconStatusButton`, per explicit request. */
  onClick: () => void
  /** Unseen-alert badge count (`useUnseenAlertCount`) — owned by `App.tsx`, not derived here, so dismissing a toast never shrinks it; only visiting the Alerts tab does. */
  count: number
}

/**
 * Header alert bell — a real *action* button (`CONTEXT.md`'s distinction
 * from a *status* button): tapping it navigates to the "Alerts" tab
 * rather than opening a popover in place, so it's styled like
 * `ThemeToggleButton`/`DisplayPowerButton` (opaque `bg-foreground/10`
 * circle), not `IconStatusButton`'s transparent trigger.
 *
 * The icon is tinted `text-destructive` (the codebase's "alert" red,
 * per `UplinkStatusButton`'s offline state / `TankCard`'s fault badge)
 * only while `count > 0` — no unseen alerts means no visual alarm, so
 * it falls back to the plain `text-foreground` the other header icon
 * buttons use.
 */
export function AlertsButton({ onClick, count }: AlertsButtonProps) {
  return (
    <button
      type="button"
      aria-label={count > 0 ? `Alerts, ${count} active` : 'Alerts'}
      title="Alerts"
      data-testid="alerts-button"
      onClick={onClick}
      className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/16"
    >
      <Bell className={`size-5 ${count > 0 ? 'text-destructive' : 'text-foreground'}`} />
      {count > 0 && (
        <Badge
          variant="destructive"
          size="sm"
          className="absolute top-0.5 right-0.5"
          data-testid="alerts-button-badge"
        >
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </button>
  )
}
