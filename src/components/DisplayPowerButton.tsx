import { Power, PowerOff } from 'lucide-react'
import type { DisplayPower } from '../hooks/useRenewvanBus'

export interface DisplayPowerButtonProps {
  displayPower: DisplayPower
  onSleep: () => void
  onWake: () => void
}

/**
 * Sleep/wake the kiosk display — an icon button (not a `Switch`, unlike
 * the header's dark-mode toggle), pinned as the last item in the
 * header's right-side control group so it always sits at the header's
 * far-right edge, separated from the theme toggle/status icon, per
 * explicit layout request.
 *
 * A real `<button>`, not decorative like `RouterStatusIcon` — tapping it
 * does something — so it keeps the 44×44px minimum touch target
 * (`size-11`) per docs/design-principles.md.
 *
 * Styled to match the sidebar's circular nav buttons exactly
 * (`bg-foreground/10` resting, `hover:bg-foreground/16`, `rounded-full`
 * — see `Sidebar.tsx`'s `TabsTab` className) per explicit request, so
 * both places read as the same kind of "icon button," not two different
 * control styles.
 */
export function DisplayPowerButton({ displayPower, onSleep, onWake }: DisplayPowerButtonProps) {
  const isOn = displayPower !== 'off'
  const Icon = isOn ? Power : PowerOff
  return (
    <button
      type="button"
      aria-label={isOn ? 'Sleep display' : 'Wake display'}
      title={isOn ? 'Sleep display' : 'Wake display'}
      data-testid="display-power-button"
      disabled={displayPower === null}
      onClick={() => (isOn ? onSleep() : onWake())}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/16 disabled:cursor-not-allowed disabled:opacity-64"
    >
      <Icon className="size-5" />
    </button>
  )
}
