import type { SVGProps } from 'react'
import type { DisplayPower } from '../hooks/useRenewvanBus'

// lucide-react has no "idle/sleeping display" glyph pair distinct from
// generic power on/off -- these are Material Design Icons' `sleep` and
// `sleep-off`, inlined rather than pulling in a second icon package for
// two paths.
function SleepIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M23,12H17V10L20.39,6H17V4H23V6L19.62,10H23V12M15,16H9V14L12.39,10H9V8H15V10L11.62,14H15V16M7,20H1V18L4.39,14H1V12H7V14L3.62,18H7V20Z" />
    </svg>
  )
}

function SleepOffIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M2,5.27L3.28,4L20,20.72L18.73,22L12.73,16H9V14L9.79,13.06L2,5.27M23,12H17V10L20.39,6H17V4H23V6L19.62,10H23V12M9.82,8H15V10L13.54,11.72L9.82,8M7,20H1V18L4.39,14H1V12H7V14L3.62,18H7V20Z" />
    </svg>
  )
}

export interface DisplaySleepButtonProps {
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
 * Named for what it actually does, not the retired "power" framing: this
 * never powers the Raspberry Pi itself off, only the attached display's
 * backlight (`vcgencmd display_power` / `wlopm`) — see
 * `hub/plugins/kiosk/node_kiosk.py`. Was `DisplayPowerButton` with
 * lucide's generic `Power`/`PowerOff`; renamed + re-iconed so the icon and
 * the name both say "sleep", matching what the button is actually for.
 *
 * A real `<button>`, not a decorative glyph — tapping it does something —
 * so it keeps the 44×44px minimum touch target
 * (`size-11`) per docs/design-principles.md.
 *
 * Styled to match the sidebar's circular nav buttons exactly
 * (`bg-foreground/10` resting, `hover:bg-foreground/16`, `rounded-full`
 * — see `Sidebar.tsx`'s `TabsTab` className) per explicit request, so
 * both places read as the same kind of "icon button," not two different
 * control styles.
 */
export function DisplaySleepButton({ displayPower, onSleep, onWake }: DisplaySleepButtonProps) {
  const isOn = displayPower !== 'off'
  const Icon = isOn ? SleepIcon : SleepOffIcon
  return (
    <button
      type="button"
      aria-label={isOn ? 'Sleep display' : 'Wake display'}
      title={isOn ? 'Sleep display' : 'Wake display'}
      data-testid="display-sleep-button"
      disabled={displayPower === null}
      onClick={() => (isOn ? onSleep() : onWake())}
      className="bg-foreground/10 hover:bg-foreground/16 flex size-11 shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-64"
    >
      <Icon className="size-5" />
    </button>
  )
}
