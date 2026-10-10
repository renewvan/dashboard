import { Label, Switch } from '@heroui/react'
import { useSettings } from './SettingsContext'

/**
 * The Alerts toggle: show or hide live alert toasts. Muting only suppresses
 * the toast; alerts are still tracked and recorded in history. The whole row
 * is the hit area, so `Switch` and `Switch.Content` both fill the width and
 * the padding lives inside the content.
 */
export function AlertsView() {
  const { alertsEnabled, setAlertsEnabled } = useSettings()

  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      <Switch className="w-full" isSelected={alertsEnabled} onChange={setAlertsEnabled}>
        <Switch.Content className="w-full justify-between px-3.5 py-3">
          <Label>Show alert notifications</Label>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  )
}
