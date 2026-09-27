import './SettingsTab.css'

export interface SettingsTabProps {
  onSleep: () => void
}

/**
 * Settings panel — currently contains only the display sleep button.
 * Publishes "off" to renewvan/kiosk/display/power/set via onSleep();
 * the kiosk node on the Pi executes vcgencmd display_power 0 and
 * publishes the retained state change back to the bus.
 */
export function SettingsTab({ onSleep }: SettingsTabProps) {
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
    </div>
  )
}
