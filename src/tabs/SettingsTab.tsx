import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import type { DisplayPower, TailscaleStatus } from '../hooks/useRenewvanBus'
import type { Theme } from '../hooks/useTheme'

export interface SettingsTabProps {
  displayPower: DisplayPower
  onSleep: () => void
  onWake: () => void
  tailscale: TailscaleStatus | null
  theme: Theme
  onThemeChange: (theme: Theme) => void
}

function tailscaleStatusText(tailscale: TailscaleStatus | null): string {
  if (tailscale === null) return 'Loading…'
  if (tailscale.connected) return tailscale.ip ?? 'Connected'
  if (tailscale.enabled) return 'Not authenticated'
  return 'Not installed'
}

/**
 * Settings panel — display sleep/wake toggle, dark theme toggle, and
 * Tailscale status. Kept to title + action per row, compact rows and small
 * text: a 7" kiosk display has no room for tall cards or descriptive copy
 * under every control.
 *
 * The dark-theme toggle is checked = dark (not checked = light) so its ON
 * state matches `useTheme`'s actual default — a freshly-booted kiosk
 * shows "Dark theme: on", not an inverted-feeling "Light theme: off".
 *
 * Each toggle row is a `<label>` for its `Switch` (native `for`/hidden-input
 * association, not a manual `onClick`, so a click on the switch itself
 * isn't double-counted): the whole row is the hit target, not just the
 * switch thumb, per `docs/design-principles.md`'s touch-target guidance.
 */
export function SettingsTab({
  displayPower,
  onSleep,
  onWake,
  tailscale,
  theme,
  onThemeChange,
}: SettingsTabProps) {
  return (
    <div className="rounded-lg border border-border bg-card/50 backdrop-blur-md">
      <label
        htmlFor="display-power-toggle"
        className="flex cursor-pointer items-center justify-between px-3.5 py-2.5 has-disabled:cursor-not-allowed"
      >
        <span className="text-sm">Display</span>
        <Switch
          id="display-power-toggle"
          data-testid="display-power-toggle"
          checked={displayPower !== 'off'}
          disabled={displayPower === null}
          onCheckedChange={(checked) => (checked ? onWake() : onSleep())}
        />
      </label>
      <Separator />
      <label
        htmlFor="dark-theme-toggle"
        className="flex cursor-pointer items-center justify-between px-3.5 py-2.5"
      >
        <span className="text-sm">Dark theme</span>
        <Switch
          id="dark-theme-toggle"
          data-testid="dark-theme-toggle"
          checked={theme === 'dark'}
          onCheckedChange={(checked) => onThemeChange(checked ? 'dark' : 'light')}
        />
      </label>
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
