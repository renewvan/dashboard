import type { TailscaleStatus } from '../hooks/useRenewvanBus'
import { tailscaleStatusText } from '../lib/tailscale'

export interface SettingsTabProps {
  tailscale: TailscaleStatus | null
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
    <div className="flex flex-1 flex-col h-full overflow-y-auto rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-md">
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
    </div>
  )
}
