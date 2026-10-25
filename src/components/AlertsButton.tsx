import { Bell } from 'lucide-react'
import { Badge, Button } from '@heroui/react'
import { cn } from '@/lib/utils'
import { MenuChevron } from './MenuChevron'
import { MENU_ROW, MENU_ROW_ACTIVE, MENU_ROW_ICON } from './menuStyles'

export interface AlertsButtonProps {
  /** Navigates to the "Alerts" page (`App.tsx`) — not a popover like `IconStatusButton`, per explicit request. */
  onClick: () => void
  /** Unseen-alert badge count (`useUnseenAlertCount`) — owned by `App.tsx`, not derived here, so dismissing a toast never shrinks it; only visiting the Alerts page does. */
  count: number
  /** Whether the Alerts page is the current page — shown as the solid accent
   * button (and `aria-current="page"`) so the header bell reads like a
   * selected nav item even though it isn't part of the sidebar's nav list. */
  active: boolean
  /** A full-width row (the phone drawer): the bell with "Alerts" beside it and the badge at the end. */
  fullWidth?: boolean
}

/**
 * Header alert bell — a real *action* button (`CONTEXT.md`'s distinction
 * from a *status* button): tapping it navigates to the "Alerts" page
 * rather than opening a popover in place, so it's a filled HeroUI
 * button like `ThemeToggleButton`/`DisplaySleepButton`, not
 * `IconStatusButton`'s transparent trigger.
 *
 * The icon is tinted `text-danger` only while `count > 0` — no unseen
 * alerts means no visual alarm. While `active` (the Alerts page is open)
 * the button switches to HeroUI's primary (accent) variant, which wins
 * over both the resting and alert-red states so "currently viewing"
 * always reads unambiguously. The count sits in a `Badge` anchored to
 * the button's top-right corner, capped at `9+`.
 */
export function AlertsButton({ onClick, count, active, fullWidth = false }: AlertsButtonProps) {
  const label = count > 9 ? '9+' : count
  // On the kiosk the count is a corner badge on the icon; in a drawer row it ends the row, as a pill.
  const badge =
    count <= 0 ? null : fullWidth ? (
      <span
        data-testid="alerts-button-badge"
        className="bg-danger text-danger-foreground min-w-6 rounded-full px-2 py-0.5 text-center text-xs font-semibold"
      >
        {label}
      </span>
    ) : (
      <Badge
        color="danger"
        variant="primary"
        size="sm"
        placement="top-right"
        data-testid="alerts-button-badge"
      >
        {label}
      </Badge>
    )

  const button = (
    <Button
      isIconOnly={!fullWidth}
      fullWidth={fullWidth}
      variant={!active || fullWidth ? 'ghost' : 'primary'}
      aria-label={count > 0 ? `Alerts, ${count} active` : 'Alerts'}
      aria-current={active ? 'page' : undefined}
      data-testid="alerts-button"
      data-active={active}
      className={fullWidth ? cn(MENU_ROW, active && MENU_ROW_ACTIVE) : undefined}
      onPress={onClick}
    >
      {fullWidth ? (
        <span className={MENU_ROW_ICON}>
          <Bell className={`size-5 ${!active && count > 0 ? 'text-danger' : ''}`} />
        </span>
      ) : (
        <Bell className={`size-5 ${!active && count > 0 ? 'text-danger' : ''}`} />
      )}
      {fullWidth && <span className="min-w-0 flex-1 truncate text-left">Alerts</span>}
      {fullWidth && badge}
      {fullWidth && <MenuChevron />}
    </Button>
  )

  if (fullWidth) return button
  return (
    <Badge.Anchor>
      {button}
      {badge}
    </Badge.Anchor>
  )
}
