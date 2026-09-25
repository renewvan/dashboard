import type { ConnectionStatus } from '../hooks/useVanBus'
import './ConnectionBanner.css'

export interface ConnectionBannerProps {
  status: ConnectionStatus
}

const COPY: Record<ConnectionStatus, string> = {
  connected: 'van bus connected',
  connecting: 'connecting to van bus…',
  disconnected: 'disconnected — showing last-known state',
}

/**
 * Distinguishes a live connection from stale last-known-state values, per
 * hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md
 * ("clear connection-lost state... distinguishable from legitimate
 * last-known-state values").
 */
export function ConnectionBanner({ status }: ConnectionBannerProps) {
  return (
    <div className={`connection-banner connection-banner--${status}`} data-testid="connection-banner">
      <span className="connection-banner__dot" />
      {COPY[status]}
    </div>
  )
}
