import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { DisplayPower, TailscaleStatus } from '../hooks/useRenewvanBus'

export interface SettingsTabProps {
  displayPower: DisplayPower
  onSleep: () => void
  onWake: () => void
  tailscale: TailscaleStatus | null
}

function tailscaleStatusText(tailscale: TailscaleStatus | null): string {
  if (tailscale === null) return 'Loading…'
  if (tailscale.connected) return tailscale.ip ?? 'Connected'
  if (tailscale.enabled) return 'Not authenticated'
  return 'Not installed'
}

/**
 * Settings panel — display sleep/wake toggle and Tailscale status. Kept to
 * title + action per row, compact rows and small text: a 7" kiosk display
 * has no room for tall cards or descriptive copy under every control.
 */
export function SettingsTab({ displayPower, onSleep, onWake, tailscale }: SettingsTabProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <span className="text-sm">Display</span>
        <Switch
          id="display-power-toggle"
          data-testid="display-power-toggle"
          checked={displayPower !== 'off'}
          disabled={displayPower === null}
          onCheckedChange={(checked) => (checked ? onWake() : onSleep())}
        />
      </div>
      <Separator />
      <div className="flex items-center justify-between px-3.5 py-2.5">
        <span className="text-sm">Tailscale</span>
        <div className="flex items-center gap-2" data-testid="tailscale-status">
          <span
            className={`h-2 w-2 shrink-0 rounded-full ${
              tailscale?.connected ? 'bg-success' : 'bg-muted-foreground'
            }`}
          />
          <span className="text-muted-foreground text-xs">{tailscaleStatusText(tailscale)}</span>
        </div>
      </div>
    </div>
  )
}
