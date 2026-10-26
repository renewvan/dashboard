import { Label, Slider, Switch, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import type { AutoSleepTimeoutMinutes } from '@/hooks/useRenewvanBus'
import type { NavbarPosition } from '@/hooks/useNavbarPosition'
import type { SettingsNavStyle } from '@/hooks/useSettingsNavStyle'
import type { Theme } from '@/hooks/useTheme'
import { MAP_THEME_LABELS } from '@/hooks/useMapTheme'
import { START_VIEW_LABELS } from '@/hooks/useStartView'
import { Card, ChoiceRow } from '../../shared/ChoiceRow'
import { Group } from '../../shared/Group'
import { GroupRow } from '../../shared/GroupRow'
import { useSettingsPreferences, useSettingsActions } from '../../SettingsContext'
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

/** Label, live `NN%` readout (a dash while unknown) and the slider that drives it. */
function BrightnessRow() {
  const { brightness } = useSettingsPreferences()
  const { setBrightness } = useSettingsActions()

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
  const { autoSleepEnabled } = useSettingsPreferences()
  const { setAutoSleepEnabled } = useSettingsActions()

  return (
    <Switch
      className="w-full"
      isSelected={autoSleepEnabled ?? false}
      isDisabled={autoSleepEnabled === null}
      onChange={setAutoSleepEnabled}
    >
      <Switch.Content className="w-full items-start justify-between px-3.5 py-3">
        <Label className="flex flex-col text-sm font-medium">
          Auto-sleep
          {autoSleepEnabled === true && (
            <span className="text-muted absolute top-11 text-xs">Sleep after</span>
          )}
        </Label>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  )
}

/** Shown only while auto-sleep is on. Re-tapping the selected value sends nothing. */
function SleepAfterRow() {
  const { autoSleepTimeoutMinutes } = useSettingsPreferences()
  const { setAutoSleepTimeoutMinutes } = useSettingsActions()

  return (
    <div className="flex items-center justify-end gap-3 px-3.5 pb-3">
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

const NAVBAR_POSITION_CHOICES: { value: NavbarPosition; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'bottom', label: 'Bottom' },
]

const NAV_STYLE_CHOICES: { value: SettingsNavStyle; label: string }[] = [
  { value: 'subpage', label: 'Subpages' },
  { value: 'drawer', label: 'Drawers' },
]

/** Light or dark: the same choice as the header toggle, applied at once. */
function ThemeRow() {
  const { theme } = useSettingsPreferences()
  const { setTheme } = useSettingsActions()
  return <ChoiceRow label="Theme" choices={THEME_CHOICES} value={theme} onChange={setTheme} />
}

interface DisplayViewProps {
  /** The style Settings is actually using (a phone is always subpage, whatever is stored). */
  navStyle: SettingsNavStyle
  onNavStyleChange: (style: SettingsNavStyle) => void
  /** Where the navbar actually is (a phone is always at the bottom, whatever is stored). */
  navbarPosition: NavbarPosition
  onNavbarPositionChange: (position: NavbarPosition) => void
  /** On a phone both navigation choices are fixed, so their toggles are shown but disabled. */
  isMobile: boolean
  onOpen: (view: SettingsSubView) => void
}

/**
 * Settings › General › Display & Appearance, in two groups. Appearance (what the app shows and how
 * it is laid out): Widgets, then a Pages group (Start, Power and Map page) and a Navigation group
 * (where the navbar sits and how Settings opens, both chosen inline). Display (the screen: theme,
 * brightness, auto-sleep and its timeout).
 */
export function DisplayView({
  navStyle,
  onNavStyleChange,
  navbarPosition,
  onNavbarPositionChange,
  isMobile,
  onOpen,
}: DisplayViewProps) {
  const { autoSleepEnabled, mapTheme, startView } = useSettingsPreferences()

  return (
    <div className="flex flex-col gap-4">
      <Group title="Appearance">
        <GroupRow
          label="Widgets"
          description="Choose and arrange the Start page widgets"
          onOpen={() => onOpen('widgets')}
        />
        <Group title="Pages" nested>
          <GroupRow
            label="Start page"
            description={`Start view: ${START_VIEW_LABELS[startView]}`}
            onOpen={() => onOpen('start-page')}
          />
          <GroupRow
            label="Power page"
            description="Van tiles or van orbs"
            onOpen={() => onOpen('power-page')}
          />
          <GroupRow
            label="Map page"
            description={`Map theme: ${MAP_THEME_LABELS[mapTheme]}`}
            onOpen={() => onOpen('map-page')}
          />
        </Group>
        <Group title="Navigation" nested>
          <Card>
            <ChoiceRow
              label="Navigation position"
              choices={NAVBAR_POSITION_CHOICES}
              value={navbarPosition}
              onChange={onNavbarPositionChange}
              isDisabled={isMobile}
            />
          </Card>
          <Card>
            <ChoiceRow
              label="Navigation style"
              choices={NAV_STYLE_CHOICES}
              value={navStyle}
              onChange={onNavStyleChange}
              isDisabled={isMobile}
            />
          </Card>
        </Group>
      </Group>
      <Group title="Display">
        <Card>
          <ThemeRow />
        </Card>
        <Card>
          <BrightnessRow />
        </Card>
        <Card>
          <AutoSleepRow />
          {autoSleepEnabled === true && <SleepAfterRow />}
        </Card>
      </Group>
    </div>
  )
}
