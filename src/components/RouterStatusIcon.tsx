import routerOffSvg from '../../assets/router-off.svg?raw'
import routerSvg from '../../assets/router.svg?raw'
import type { ConnectionStatus } from '../hooks/useRenewvanBus'
import { IconStatusButton } from './IconStatusButton'

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
 * Bus-link status (`CONTEXT.md`) as a status button: tap opens a detail
 * popover carrying the same three-state copy as the accessible name.
 * Supersedes the earlier "not tappable, `role=img`" design — it now
 * builds on the shared `IconStatusButton` like the uplink button, and
 * since it's interactive the 44×44px touch-target rule in
 * `docs/design-principles.md` applies (the trigger provides it).
 *
 * Renders `assets/router.svg`/`router-off.svg` inline (Vite's `?raw`
 * import, no SVGR plugin in this project) rather than as an `<img src>`,
 * because both assets use `stroke="currentColor"` — inlining is what
 * lets `text-success`/`text-warning`/`text-destructive` actually recolor
 * the icon per status; an `<img>` reference can't inherit text color.
 * `connecting` reuses `router.svg` (no distinct "connecting" asset
 * exists) with `animate-pulse` so it doesn't read identically to
 * `connected`.
 */
export function RouterStatusIcon({ status }: RouterStatusIconProps) {
  return (
    <IconStatusButton
      label={COPY[status]}
      data-testid="router-status-icon"
      data-status={status}
      icon={
        <span
          className={`flex size-4 shrink-0 items-center justify-center [&_svg]:h-full [&_svg]:w-full ${COLOR_CLASS[status]}`}
          // trusted, build-time-bundled local SVG source, not user input
          dangerouslySetInnerHTML={{ __html: MARKUP[status] }}
        />
      }
      popoverContent={COPY[status]}
    />
  )
}
