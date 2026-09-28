import type { TailscaleStatus } from '../hooks/useRenewvanBus'
import './SettingsTab.css'

export interface SettingsTabProps {
  onSleep: () => void
  tailscale: TailscaleStatus | null
}

/**
 * Settings panel — display sleep control and system status (Tailscale VPN).
 */
export function SettingsTab({ onSleep, tailscale }: SettingsTabProps) {
  return (
    <div className="settings-tab">
      <div className="settings-tab__section">
        <p className="settings-tab__label">Display</p>
        <button
          type="button"
          className="settings-tab__sleep-btn"
          data-testid="sleep-button"
          onClick={onSleep}
        >
          🌙 Sleep display
        </button>
      </div>

      <div className="settings-tab__section">
        <p className="settings-tab__label">Network</p>
        <div className="settings-tab__status-row" data-testid="tailscale-status">
          <span className={`settings-tab__dot settings-tab__dot--${tailscale?.connected ? 'on' : 'off'}`} />
          <span className="settings-tab__status-text">
            {tailscale === null
              ? 'Tailscale — loading…'
              : tailscale.connected
                ? `Tailscale — ${tailscale.ip}`
                : tailscale.enabled
                  ? 'Tailscale — not authenticated'
                  : 'Tailscale — not installed'}
          </span>
        </div>
      </div>
    </div>
  )
}
