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

/** Coss's alert variants default to a very subtle (~4%) background tint,
 * meant for a solid page background — over the theme wallpaper that's too
 * faint to read. Bumped per status to stay legible while keeping the
 * color distinction. */
const BG_CLASS: Record<ConnectionStatus, string> = {
  connected: 'bg-success/20',
  connecting: 'bg-warning/20',
  disconnected: 'bg-destructive/20',
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
    <Alert
      variant={VARIANT[status]}
      className={`mb-3.5 py-2 ${BG_CLASS[status]}`}
      data-testid="connection-banner"
    >
      <AlertDescription className="text-foreground">{COPY[status]}</AlertDescription>
    </Alert>
  )
}
