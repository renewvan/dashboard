import { MonitorCheck, MonitorCloud, MonitorX } from 'lucide-react'
import type { ConnectionStatus } from '../hooks/useRenewvanBus'

export interface ConnectionStatusButtonProps {
  status: ConnectionStatus
}

const COPY: Record<ConnectionStatus, string> = {
  connected: 'renewvan hub connected',
  connecting: 'connecting to renewvan hub…',
  disconnected: 'disconnected — showing last-known state',
}

const ICON: Record<ConnectionStatus, typeof MonitorCheck> = {
  connected: MonitorCheck,
  connecting: MonitorCloud,
  disconnected: MonitorX,
}

const COLOR_CLASS: Record<ConnectionStatus, string> = {
  connected: 'text-success',
  connecting: 'text-warning',
  disconnected: 'text-destructive',
}

/**
 * Replaces the old `ConnectionBanner` full-width alert (which ate space in
 * the main content pane above every tab) with a status icon button in the
 * header, per explicit design request. Distinguishing a live connection
 * from stale last-known-state values is still the goal — per
 * hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md
 * ("clear connection-lost state... distinguishable from legitimate
 * last-known-state values") — just conveyed by icon + color instead of
 * a persistent text banner. Full status text stays available as the
 * button's accessible name (`aria-label`) and native tooltip (`title`)
 * for sighted users who want the explanation, not just the icon.
 *
 * 44×44px minimum touch target (`size-11`) per docs/design-principles.md,
 * same rule as every other kiosk control.
 */
export function ConnectionStatusButton({ status }: ConnectionStatusButtonProps) {
  const Icon = ICON[status]
  return (
    <button
      type="button"
      aria-label={COPY[status]}
      title={COPY[status]}
      data-testid="connection-status-button"
      data-status={status}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full bg-foreground/10 hover:bg-foreground/16 ${COLOR_CLASS[status]}`}
    >
      <Icon className="size-6" />
    </button>
  )
}
