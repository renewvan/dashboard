import { Label, Slider, Switch, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import type { AutoSleepTimeoutMinutes } from '@/hooks/useRenewvanBus'
import { useSettings } from './SettingsContext'

const TIMEOUT_CHOICES: AutoSleepTimeoutMinutes[] = [1, 5, 15, 30]

function isTimeoutChoice(value: number): value is AutoSleepTimeoutMinutes {
  return TIMEOUT_CHOICES.some((choice) => choice === value)
}

/** Label, live `NN%` readout (a dash while unknown) and the slider that drives it. */
function BrightnessRow() {
  const { brightness, setBrightness } = useSettings()

  return (
    <div className="px-3.5 py-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Brightness</span>
        <span className="text-muted text-xs tabular-nums">
          {brightness === null ? '—' : `${brightness}%`}
        </span>
      </div>
      <Slider
        className="mt-3 w-full"
        aria-label="Brightness"
        value={brightness ?? 0}
        isDisabled={brightness === null}
        // The screen dims as the driver drags, so every move is a command. Not
        // `onChangeEnd` as well: a key press fires both, and the final value would go out twice.
        onChange={(value) => setBrightness(typeof value === 'number' ? value : value[0])}
      >
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  )
}

/** Whole-row switch: padding sits inside `Switch.Content`, so the label area toggles too. */
function AutoSleepRow() {
  const { autoSleepEnabled, setAutoSleepEnabled } = useSettings()

  return (
    <Switch
      className="w-full"
      isSelected={autoSleepEnabled ?? false}
      isDisabled={autoSleepEnabled === null}
      onChange={setAutoSleepEnabled}
    >
      <Switch.Content className="w-full justify-between px-3.5 py-3">
        <Label className="text-sm font-medium">Auto-sleep</Label>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  )
}

/** Shown only while auto-sleep is on. Re-tapping the selected value sends nothing. */
function SleepAfterRow() {
  const { autoSleepTimeoutMinutes, setAutoSleepTimeoutMinutes } = useSettings()

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <span className="text-muted text-xs">Sleep after</span>
      <ToggleButtonGroup
        aria-label="Sleep after"
        selectionMode="single"
        disallowEmptySelection
        isDisabled={autoSleepTimeoutMinutes === null}
        selectedKeys={
          new Set(autoSleepTimeoutMinutes === null ? [] : [String(autoSleepTimeoutMinutes)])
        }
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          if (key === undefined) return
          const next = Number(key)
          // HeroUI re-fires the selection on a re-tap of the selected item.
          if (isTimeoutChoice(next) && next !== autoSleepTimeoutMinutes) {
            setAutoSleepTimeoutMinutes(next)
          }
        }}
      >
        {TIMEOUT_CHOICES.map((minutes, index) => (
          <ToggleButton key={minutes} id={String(minutes)}>
            {index > 0 && <ToggleButtonGroup.Separator />}
            {minutes}m
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}

/** Settings › General › Display: brightness, auto-sleep, and its timeout. */
export function DisplayView() {
  const { autoSleepEnabled } = useSettings()

  return (
    <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
      <BrightnessRow />
      <AutoSleepRow />
      {autoSleepEnabled === true && <SleepAfterRow />}
    </div>
  )
}
