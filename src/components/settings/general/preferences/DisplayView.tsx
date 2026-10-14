import type { ReactNode } from 'react'
import { Label, Separator, Slider, Switch, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import type { AutoSleepTimeoutMinutes } from '@/hooks/useRenewvanBus'
import type { NavbarPosition } from '@/hooks/useNavbarPosition'
import type { SettingsNavStyle } from '@/hooks/useSettingsNavStyle'
import type { Theme } from '@/hooks/useTheme'
import { Group } from '../../shared/Group'
import { GroupRow } from '../../shared/GroupRow'
import { useSettings } from '../../SettingsContext'
import type { SettingsSubView } from '../../views'

const TIMEOUT_CHOICES: AutoSleepTimeoutMinutes[] = [1, 5, 15, 30]

function isTimeoutChoice(value: number): value is AutoSleepTimeoutMinutes {
  return TIMEOUT_CHOICES.some((choice) => choice === value)
}

const TICKS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]

/** Decorative 0-100 scale under the slider (the prototype's variant A); the `NN%` readout carries the value. */
function BrightnessScale() {
  return (
    <div
      aria-hidden="true"
      className="text-muted mt-1 flex w-full items-center justify-between gap-1 px-3 text-xs font-medium"
    >
      {TICKS.map((tick, i) => (
        <span key={tick} className="flex w-0 flex-col items-center justify-center gap-1">
          <span className={i % 2 === 0 ? 'bg-muted/70 h-1 w-px' : 'bg-muted/70 h-0.5 w-px'} />
          <span className={i % 2 === 0 ? '' : 'opacity-0'}>{tick}</span>
        </span>
      ))}
    </div>
  )
}

/** One bordered, rounded card per control, stacked with a gap (like the group rows). */
function Card({ children }: { children: ReactNode }) {
  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">{children}</div>
  )
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
      <BrightnessScale />
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

const THEME_CHOICES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

/** Light or dark: the same choice as the header toggle, applied at once. Re-tapping the selected one sends nothing. */
function ThemeRow() {
  const { theme, setTheme } = useSettings()

  return (
    <div className="flex items-center justify-between gap-3 px-3.5 py-3">
      <span className="text-sm font-medium">Theme</span>
      <ToggleButtonGroup
        aria-label="Theme"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set([theme])}
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          // HeroUI re-fires the selection on a re-tap of the selected item.
          const next = THEME_CHOICES.find((choice) => choice.value === key)
          if (next !== undefined && next.value !== theme) setTheme(next.value)
        }}
      >
        {THEME_CHOICES.map((choice, index) => (
          <ToggleButton key={choice.value} id={choice.value}>
            {index > 0 && <ToggleButtonGroup.Separator />}
            {choice.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}

interface DisplayViewProps {
  /** The style Settings is actually using (so the row never claims a style a phone cannot get). */
  navStyle: SettingsNavStyle
  /** Where the navbar actually is (a phone is always at the bottom, whatever is stored). */
  navbarPosition: NavbarPosition
  onOpen: (view: SettingsSubView) => void
}

/**
 * Settings › General › Display & Appearance, in two groups: Display (the screen: theme,
 * brightness, auto-sleep and its timeout) and Appearance (what the app shows and how it is
 * laid out: Start page, then, below a divider, where the navbar sits and how Settings opens).
 */
export function DisplayView({ navStyle, navbarPosition, onOpen }: DisplayViewProps) {
  const { autoSleepEnabled } = useSettings()

  return (
    <div className="flex flex-col gap-4">
      <Group title="Display">
        <Card>
          <ThemeRow />
        </Card>
        <Card>
          <BrightnessRow />
        </Card>
        <Card>
          <AutoSleepRow />
        </Card>
        {autoSleepEnabled === true && (
          <Card>
            <SleepAfterRow />
          </Card>
        )}
      </Group>
      <Group title="Appearance">
        <GroupRow
          label="Start page"
          description="Power readings and scales"
          onOpen={() => onOpen('start-page')}
        />
        <Separator className="my-1" />
        <GroupRow
          label="Navigation position"
          description={navbarPosition === 'left' ? 'Left' : 'Bottom'}
          onOpen={() => onOpen('navbar')}
        />
        <GroupRow
          label="Navigation style"
          description={navStyle === 'subpage' ? 'Subpages' : 'Drawers'}
          onOpen={() => onOpen('navigation')}
        />
      </Group>
    </div>
  )
}
