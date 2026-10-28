import { Label, Radio, RadioGroup } from '@heroui/react'
import { AUTO_PRIMARY_BATTERY, compareInstanceIds, primaryBattery } from '@/lib/primaryBattery'
import { instanceLabel } from '@/lib/instances'
import { useSettingsActions, useSettingsData } from '../SettingsContext'

/**
 * Settings › Devices › Batteries › Primary battery: the shared choice of the battery the Start dial
 * and the Power page read, as radios (Auto, then one per battery on the bus, labelled like its
 * card). The choice is the hub's, so every client follows it; the note says what is actually read
 * now, which differs from the choice while the chosen instance is absent or has not fully arrived.
 * Picking a radio applies at once and stays on the page.
 */
export function PrimaryBatteryView() {
  const { drivers, batteries, primaryBatterySelection } = useSettingsData()
  const { setPrimaryBattery } = useSettingsActions()
  const choices = [
    { value: AUTO_PRIMARY_BATTERY, label: 'Auto' },
    ...Object.keys(batteries)
      .sort(compareInstanceIds)
      .map((id) => ({ value: id, label: instanceLabel(id, batteries[id], drivers) })),
  ]
  const labelOf = (id: string) => choices.find((choice) => choice.value === id)?.label ?? id
  const current = primaryBattery(batteries, primaryBatterySelection)

  return (
    <div className="flex flex-col gap-3">
      <RadioGroup
        aria-label="Primary battery"
        value={primaryBatterySelection}
        onChange={setPrimaryBattery}
        className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border"
      >
        {choices.map((choice) => (
          // HeroUI's component CSS is unlayered, so the row layout and the round control need `!`.
          <Radio
            key={choice.value}
            value={choice.value}
            className="data-[selected=true]:[&_[data-slot=radio-control]]:border-accent! min-h-11 w-full flex-row! items-center! gap-3! px-3.5 py-3"
          >
            <Radio.Control className="border-muted! size-5! shrink-0 rounded-full! border-2!">
              <Radio.Indicator className="rounded-full! before:rounded-full! after:rounded-full!" />
            </Radio.Control>
            <Radio.Content className="static! after:absolute after:inset-0">
              <Label className="text-sm font-medium">{choice.label}</Label>
            </Radio.Content>
          </Radio>
        ))}
      </RadioGroup>
      {current !== undefined && (
        <p className="text-muted px-1 text-sm">
          {current.mode === 'fallback'
            ? `${primaryBatterySelection} is not available, using ${labelOf(current.id)}`
            : `Reading from ${labelOf(current.id)}`}
        </p>
      )}
    </div>
  )
}
