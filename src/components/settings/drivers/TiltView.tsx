import { useState } from 'react'
import { AlertDialog, Button } from '@heroui/react'
import { formatDeg, tiltReading } from '@/lib/tilt'
import { instanceLabel, ownerName } from '@/lib/instances'
import { DetailList, DetailRow } from '../shared/DetailList'
import { useSettingsActions, useSettingsData } from '../SettingsContext'

/**
 * Settings › Devices › Tilt › <sensor> › Details: the live roll and pitch, and the install calibration.
 * "Set level" captures the current attitude as 0°/0° (the driver persists it), so a dialog asks first:
 * a stray tap on a kiosk while the van is on a slope would otherwise zero the sensor wrongly.
 */
export function TiltDetails({ id }: { id: string }) {
  const { tilt, drivers } = useSettingsData()
  const { setTiltLevel, resetTiltLevel } = useSettingsActions()
  const [confirming, setConfirming] = useState(false)
  const record = tilt[id]
  if (record === undefined) return null

  const { roll, pitch } = tiltReading(record)
  const live = roll !== null
  const label = instanceLabel(id, record, drivers)

  return (
    <div className="flex flex-col gap-3">
      <DetailList label={`${label} readings`}>
        <DetailRow label="Roll" value={formatDeg(roll)} />
        <DetailRow label="Pitch" value={formatDeg(pitch)} />
        <DetailRow label="Driver" value={ownerName(record, drivers) ?? null} />
      </DetailList>
      <section
        aria-label="Calibration"
        className="border-border bg-surface flex flex-col gap-3 rounded-2xl border px-3.5 py-3"
      >
        <p className="text-muted text-sm">
          Park the van on level ground, then set level to make the current roll and pitch read 0°.
        </p>
        <div className="flex justify-end gap-2">
          <Button
            variant="primary"
            className="min-h-12"
            isDisabled={!live}
            onPress={() => setConfirming(true)}
          >
            Set level
          </Button>
          <Button variant="secondary" className="min-h-12" onPress={() => resetTiltLevel(id)}>
            Reset
          </Button>
        </div>
        {!live && (
          <p className="text-muted text-xs">The sensor is not reporting; it cannot be set yet.</p>
        )}
      </section>
      <AlertDialog isOpen={confirming} onOpenChange={setConfirming}>
        {/* Controlled by `confirming`; the trigger only satisfies the root (as on the Relays page). */}
        <AlertDialog.Trigger aria-hidden="true" className="hidden" />
        <AlertDialog.Backdrop isKeyboardDismissDisabled={false}>
          <AlertDialog.Container>
            <AlertDialog.Dialog>
              {({ close }) => (
                <>
                  <AlertDialog.Header>
                    <AlertDialog.Heading>Set level?</AlertDialog.Heading>
                  </AlertDialog.Header>
                  <AlertDialog.Body>
                    <p>
                      The van must be parked on level ground. Roll and pitch will read 0° from now
                      on, from where it sits.
                    </p>
                  </AlertDialog.Body>
                  <AlertDialog.Footer>
                    <Button variant="tertiary" onPress={close}>
                      Cancel
                    </Button>
                    <Button
                      onPress={() => {
                        setTiltLevel(id)
                        close()
                      }}
                    >
                      Set level
                    </Button>
                  </AlertDialog.Footer>
                </>
              )}
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
    </div>
  )
}
