import routerOffSvg from '../../assets/router-off.svg?raw'
import routerSvg from '../../assets/router.svg?raw'
import type { ConnectionStatus } from '../hooks/useRenewvanBus'

export interface RouterStatusIconProps {
  status: ConnectionStatus
}

const COPY: Record<ConnectionStatus, string> = {
  connected: 'renewvan hub connected',
  connecting: 'connecting to renewvan hub…',
  disconnected: 'disconnected — showing last-known state',
}

const MARKUP: Record<ConnectionStatus, string> = {
  connected: routerSvg,
  connecting: routerSvg,
  disconnected: routerOffSvg,
}

const COLOR_CLASS: Record<ConnectionStatus, string> = {
  connected: 'text-success',
  connecting: 'text-warning animate-pulse',
  disconnected: 'text-destructive',
}

/**
 * Connection status as a plain icon, not a button — per explicit design
 * request, this replaced `ConnectionStatusButton`: nothing happens on
 * tap, so it shouldn't look tappable. `role="img"` + `aria-label` carry
 * the same accessible status text the button's `aria-label`/`title` used
 * to, distinguishing a live connection from stale last-known-state
 * values (per
 * hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md).
 *
 * Renders `assets/router.svg`/`router-off.svg` inline (Vite's `?raw`
 * import, no SVGR plugin in this project) rather than as an `<img src>`,
 * because both assets use `stroke="currentColor"` — inlining is what
 * lets `text-success`/`text-warning`/`text-destructive` actually recolor
 * the icon per status; an `<img>` reference can't inherit text color.
 * `connecting` reuses `router.svg` (no distinct "connecting" asset
 * exists) with `animate-pulse` so it doesn't read identically to
 * `connected`.
 *
 * Decorative-only, so it's exempt from the 44×44px touch-target rule in
 * docs/design-principles.md (that rule covers interactive surfaces).
 */
export function RouterStatusIcon({ status }: RouterStatusIconProps) {
  return (
    <span
      role="img"
      aria-label={COPY[status]}
      title={COPY[status]}
      data-testid="router-status-icon"
      data-status={status}
      className={`flex size-6 shrink-0 items-center justify-center [&_svg]:h-full [&_svg]:w-full ${COLOR_CLASS[status]}`}
      // trusted, build-time-bundled local SVG source, not user input
      dangerouslySetInnerHTML={{ __html: MARKUP[status] }}
    />
  )
}
