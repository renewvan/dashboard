import { Alert, AlertDescription } from '@/components/ui/alert'
import type { ConnectionStatus } from '../hooks/useRenewvanBus'

export interface ConnectionBannerProps {
  status: ConnectionStatus
}

const COPY: Record<ConnectionStatus, string> = {
  connected: 'renewvan hub connected',
  connecting: 'connecting to renewvan hub…',
  disconnected: 'disconnected — showing last-known state',
}

const VARIANT: Record<ConnectionStatus, 'success' | 'warning' | 'error'> = {
  connected: 'success',
  connecting: 'warning',
  disconnected: 'error',
}

/**
 * Distinguishes a live connection from stale last-known-state values, per
 * hub/.scratch/renewvan-hub-v0-build/issues/06-dashboard-web-app.md
 * ("clear connection-lost state... distinguishable from legitimate
 * last-known-state values"). Built on Coss's Alert primitive
 * (`src/components/ui/alert.tsx`).
 */
export function ConnectionBanner({ status }: ConnectionBannerProps) {
  return (
    <Alert variant={VARIANT[status]} className="mb-3.5 py-2" data-testid="connection-banner">
      <AlertDescription>{COPY[status]}</AlertDescription>
    </Alert>
  )
}
