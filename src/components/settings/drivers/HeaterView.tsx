import { useState } from 'react'
import { AlertDialog, Button, Label, Switch } from '@heroui/react'
import {
  MODE_LABELS,
  canChangeSettings,
  heaterSensor,
  isReporting,
  sensorLocked,
  operatingMode,
} from '@/lib/heater'
import type { HeaterSensor } from '@/lib/heater'
import type { Heater } from '@/types'
import { HeaterReadings } from '@/components/heater/HeaterReadings'
import { useSettingsActions, useSettingsData, useSettingsPreferences } from '../SettingsContext'
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

/** The switch for the Driver's `commands_enabled`, and the confirmation before it flips. */
function CommandsSwitch({ id, heater, label }: { id: string; heater: Heater; label: string }) {
  const { demoMode } = useSettingsPreferences()
  const { setHeaterCommandsEnabled } = useSettingsActions()
  const [target, setTarget] = useState<boolean | null>(null)
  const enabled = heater.commands_enabled === true
  return (
    <>
      <Card>
        <Switch
          className="w-full"
          isSelected={enabled}
          isDisabled={demoMode}
          onChange={(next) => setTarget(next)}
        >
          <Switch.Content className="w-full justify-between px-3.5 py-3">
            <Label className="text-sm font-medium">Heater controls</Label>
            <Switch.Control>
              <Switch.Thumb />
            </Switch.Control>
          </Switch.Content>
        </Switch>
      </Card>
      <p className="text-muted px-1 text-sm">
        {demoMode ? 'Demo mode is read-only.' : 'Allow the dashboard to control the heater.'}
      </p>
      <AlertDialog isOpen={target !== null} onOpenChange={(open) => !open && setTarget(null)}>
        {/* Controlled by `target`; the trigger only satisfies the root (as on the Relays page). */}
        <AlertDialog.Trigger aria-hidden="true" className="hidden" />
        <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>
                      {target ? `Enable controls for ${label}?` : `Disable controls for ${label}?`}
                    </AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      {target
                        ? 'Anyone on the van\u2019s network will be able to start and stop the heater, because the broker has no login. Make sure someone is with the van.'
                        : 'The heater keeps doing what it is doing, but it can no longer be started, stopped or adjusted from the dashboard.'}
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="tertiary" onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      onPress={() => {
                        if (target !== null) setHeaterCommandsEnabled(id, target)
                        close()
                      }}
                    >
                      {target ? 'Enable' : 'Disable'}
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </>
  )
}

/**
 * Settings › Heater: the heater controls switch, and what the heater reads the room temperature from. As on the Autoterm Comfort
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
            <CommandsSwitch id={id} heater={heater} label={heater.name ?? id} />
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
            <Card>
              <dl
                aria-label={`${heater.name ?? id} readings`}
                className="grid grid-cols-2 gap-x-4 gap-y-3 px-3.5 py-3"
              >
                <HeaterReadings heater={heater} reporting={isReporting(heater)} />
              </dl>
            </Card>
          </Group>
        )
      })}
    </div>
  )
}
