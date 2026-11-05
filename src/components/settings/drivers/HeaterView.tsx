import {
  MODE_LABELS,
  canChangeSettings,
  heaterSensor,
  sensorLocked,
  operatingMode,
} from '@/lib/heater'
import type { HeaterSensor } from '@/lib/heater'
import type { Heater } from '@/types'
import { useSettingsActions, useSettingsData } from '../SettingsContext'
import { ChoiceRow, Card } from '../shared/ChoiceRow'
import { Group } from '../shared/Group'

/** Why the sensor cannot be changed now, or nothing when it can. */
function lockReason(heater: Heater): string | undefined {
  if (heater.commands_enabled !== true) return 'Commands are turned off on the heater driver.'
  if (!canChangeSettings(heater)) return 'The heater is not ready for a change right now.'
  if (sensorLocked(operatingMode(heater))) {
    return 'The heater does not accept a sensor change in this mode. Switch to Temperature mode on the Heater page first.'
  }
  return undefined
}

/**
 * Settings › Heater: what the heater reads the room temperature from. As on the Autoterm Comfort
 * Control panel (manual §4.3), the external probe is shown but disabled until one is fitted.
 */
export function HeaterView() {
  const { heaters } = useSettingsData()
  const { setHeaterMode } = useSettingsActions()
  const ids = Object.keys(heaters).sort()

  if (ids.length === 0) {
    return <p className="text-muted px-1 text-sm">No heater found.</p>
  }

  return (
    <div className="flex flex-col gap-4">
      {ids.map((id) => {
        const heater = heaters[id]
        const inUse = heaterSensor(heater)
        // Both sensors always show; the external probe is greyed out until one is fitted (it stays
        // available while it is already the sensor in use).
        const probeFitted =
          heater.external_temperature_c !== undefined || inUse === 'external_temperature'
        const choices: { value: HeaterSensor; label: string; isDisabled?: boolean }[] = [
          { value: 'heater_temperature', label: MODE_LABELS.heater_temperature },
          {
            value: 'external_temperature',
            label: MODE_LABELS.external_temperature,
            isDisabled: !probeFitted,
          },
        ]
        const reason = lockReason(heater)
        return (
          <Group key={id} title={heater.name ?? id}>
            <Card>
              <ChoiceRow
                label="Temperature sensor"
                choices={choices}
                value={inUse ?? 'heater_temperature'}
                onChange={(next) => setHeaterMode(id, next)}
                isDisabled={reason !== undefined}
              />
            </Card>
            <p className="text-muted px-1 text-sm">
              {reason ??
                'The sensor a temperature mode reads. The external probe is available once one is fitted.'}
            </p>
          </Group>
        )
      })}
    </div>
  )
}
