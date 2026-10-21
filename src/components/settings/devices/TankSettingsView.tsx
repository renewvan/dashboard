import { Label, Switch } from '@heroui/react'

/**
 * Settings › Devices › Tanks › <tank>. The tank's settings will mirror the device's own
 * config (https://github.com/alexsanzder/dbus-ads1115#configuration-parameters); for now
 * only Enabled is shown, and it is read-only: `enabled` is a driver-tank `config.ini` value
 * read at startup, with no wire field or command topic to change it. The whole row is the
 * hit area, as in the other Settings switches.
 */
export function TankSettingsView() {
  return (
    <div className="flex flex-col gap-2">
      <div className="border-border bg-surface overflow-hidden rounded-2xl border">
        <Switch className="w-full" isSelected isDisabled>
          <Switch.Content className="w-full justify-between px-3.5 py-3">
            <Label>Enabled</Label>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </div>
      <p className="text-muted px-1 text-xs">
        Tank settings are not configurable from the dashboard yet.
      </p>
    </div>
  )
}
