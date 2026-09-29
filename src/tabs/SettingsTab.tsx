import type { TailscaleStatus } from '../hooks/useRenewvanBus'

export interface SettingsTabProps {
  tailscale: TailscaleStatus | null
}

function tailscaleStatusText(tailscale: TailscaleStatus | null): string {
  if (tailscale === null) return 'Loading…'
  if (tailscale.connected) return tailscale.ip ?? 'Connected'
  if (tailscale.enabled) return 'Not authenticated'
  return 'Not installed'
}

/**
 * Settings panel — now just Tailscale status. The display sleep/wake
 * toggle and dark-theme toggle used to live here as rows, but moved into
 * the header (`ThemeToggleButton`/`DisplayPowerButton` in `App.tsx`) for
 * one-tap access
 * from any tab instead of a trip to Settings, per explicit design
 * request. Kept as its own tab (rather than folding Tailscale into the
 * header too) since connectivity status isn't something a driver needs
 * to glance at from every screen the way display power and theme are.
 */
export function SettingsTab({ tailscale }: SettingsTabProps) {
  return (
    <div className="rounded-lg border border-border bg-card/20 backdrop-blur-md">
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
