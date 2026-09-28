import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { TailscaleStatus } from '../hooks/useRenewvanBus'

export interface SettingsTabProps {
  onSleep: () => void
  tailscale: TailscaleStatus | null
}

/**
 * Settings panel — display sleep control and system status (Tailscale
 * VPN). Built on Coss's Card and Button primitives.
 */
export function SettingsTab({ onSleep, tailscale }: SettingsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
            Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="secondary"
            size="lg"
            className="w-full justify-start"
            data-testid="sleep-button"
            onClick={onSleep}
          >
            🌙 Sleep display
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
            Network
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2.5" data-testid="tailscale-status">
            <span
              className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                tailscale?.connected ? 'bg-success' : 'bg-muted-foreground'
              }`}
            />
            <span className="text-foreground text-base">
              {tailscale === null
                ? 'Tailscale — loading…'
                : tailscale.connected
                  ? `Tailscale — ${tailscale.ip}`
                  : tailscale.enabled
                    ? 'Tailscale — not authenticated'
                    : 'Tailscale — not installed'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
