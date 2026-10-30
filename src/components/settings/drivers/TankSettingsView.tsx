import { Label, Switch } from '@heroui/react'
import { useEntityIcon } from '@/hooks/useEntityIcon'
import { TANK_ICON_NAMES } from '@/lib/entityIcons'
import { IconPicker } from '../shared/IconPicker'
import { useSettingsActions, useSettingsData } from '../SettingsContext'

/**
 * Settings › Drivers › Tanks › <tank>. The tank's settings will mirror the driver's own
 * config (https://github.com/alexsanzder/dbus-ads1115#configuration-parameters); for now
 * Enabled (read-only) and the tank's icon are shown; Enabled is read-only: `enabled` is a driver-tank `config.ini` value
 * read at startup, with no wire field or command topic to change it. The whole row is the
 * hit area, as in the other Settings switches.
 */
export function TankSettingsView({ id }: { id: string }) {
  const { tanks } = useSettingsData()
  const { setEntityIcon } = useSettingsActions()
  const icon = useEntityIcon('tank', id)
  const tank = tanks[id]
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
      <div className="border-border bg-surface rounded-2xl border px-3.5 py-3">
        <IconPicker
          names={TANK_ICON_NAMES}
          value={icon}
          isDisabled={tank?.fluid_type === undefined}
          onChange={(next) => setEntityIcon('tank', id, next)}
        />
      </div>
      <p className="text-muted px-1 text-xs">
        Tank settings are not configurable from the dashboard yet.
      </p>
    </div>
  )
}
