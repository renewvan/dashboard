import { Bell } from 'lucide-react'
import { Badge, Button } from '@heroui/react'

export interface AlertsButtonProps {
  /** Navigates to the "Alerts" tab (`App.tsx`) — not a popover like `IconStatusButton`, per explicit request. */
  onClick: () => void
  /** Unseen-alert badge count (`useUnseenAlertCount`) — owned by `App.tsx`, not derived here, so dismissing a toast never shrinks it; only visiting the Alerts tab does. */
  count: number
  /** Whether the Alerts tab is the current tab — shown as the solid accent
   * button (and `aria-current="page"`) so the header bell reads like a
   * selected nav item even though it isn't part of the sidebar's tab list. */
  active: boolean
}

/**
 * Header alert bell — a real *action* button (`CONTEXT.md`'s distinction
 * from a *status* button): tapping it navigates to the "Alerts" tab
 * rather than opening a popover in place, so it's a filled HeroUI
 * button like `ThemeToggleButton`/`DisplaySleepButton`, not
 * `IconStatusButton`'s transparent trigger.
 *
 * The icon is tinted `text-danger` only while `count > 0` — no unseen
 * alerts means no visual alarm. While `active` (the Alerts tab is open)
 * the button switches to HeroUI's primary (accent) variant, which wins
 * over both the resting and alert-red states so "currently viewing"
 * always reads unambiguously. The count sits in a `Badge` anchored to
 * the button's top-right corner, capped at `9+`.
 */
export function AlertsButton({ onClick, count, active }: AlertsButtonProps) {
  return (
    <Badge.Anchor>
      <Button
        isIconOnly
        variant={active ? 'primary' : 'tertiary'}
        aria-label={count > 0 ? `Alerts, ${count} active` : 'Alerts'}
        aria-current={active ? 'page' : undefined}
        data-testid="alerts-button"
        data-active={active}
        onPress={onClick}
      >
        <Bell className={`size-5 ${!active && count > 0 ? 'text-danger' : ''}`} />
      </Button>
      {count > 0 && (
        <Badge
          color="danger"
          variant="primary"
          size="sm"
          placement="top-right"
          data-testid="alerts-button-badge"
        >
          {count > 9 ? '9+' : count}
        </Badge>
      )}
    </Badge.Anchor>
  )
}
