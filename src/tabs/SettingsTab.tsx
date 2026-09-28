import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import type { DisplayPower, TailscaleStatus } from '../hooks/useRenewvanBus'

export interface SettingsTabProps {
  displayPower: DisplayPower
  onSleep: () => void
  onWake: () => void
  tailscale: TailscaleStatus | null
}

/**
 * Settings panel — display sleep/wake toggle and system status (Tailscale
 * VPN). Built on Coss's Card and Switch primitives.
 */
export function SettingsTab({ displayPower, onSleep, onWake, tailscale }: SettingsTabProps) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-xs uppercase tracking-wide text-muted-foreground">
            Display
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="display-power-toggle">🌙 Display awake</Label>
            <Switch
              id="display-power-toggle"
              data-testid="display-power-toggle"
              checked={displayPower !== 'off'}
              disabled={displayPower === null}
              onCheckedChange={(checked) => (checked ? onWake() : onSleep())}
            />
          </div>
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
