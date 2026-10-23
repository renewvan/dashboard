import { Label, Switch } from '@heroui/react'
import { Group } from '../shared/Group'
import { GroupRow } from '../shared/GroupRow'
import { useSettings } from '../SettingsContext'
import type { SettingsSubView } from '../views'

interface GeneralViewProps {
  onOpen: (view: SettingsSubView) => void
}

/**
 * Whole-row switch, like Alerts, but inline: it opens no page of its own. Padding sits inside
 * `Switch.Content`, so the label area toggles too.
 */
function DemoModeRow() {
  const { demoMode, setDemoMode } = useSettings()

  return (
    <div className="border-border bg-surface overflow-hidden rounded-2xl border">
      <Switch className="w-full" isSelected={demoMode} onChange={setDemoMode}>
        <Switch.Content className="w-full justify-between gap-3 px-3.5 py-3">
          <Label className="flex flex-col items-start gap-0.5 text-sm font-medium">
            Demo mode
            <span className="text-muted text-xs font-normal">
              {demoMode ? 'Simulated van data' : 'Live van data'}
            </span>
          </Label>
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
        </Switch.Content>
      </Switch>
    </div>
  )
}

/** General's groups, System then Preferences: each row opens its own page under a live summary, bar the inline Demo mode switch. */
export function GeneralView({ onOpen }: GeneralViewProps) {
  const { alertsEnabled } = useSettings()

  return (
    <div className="flex flex-col gap-4">
      <Group title="System">
        <GroupRow
          label="Firmware"
          description="Hub and dashboard versions"
          onOpen={() => onOpen('firmware')}
        />
        <GroupRow label="About" description="Credits and licences" onOpen={() => onOpen('about')} />
        <DemoModeRow />
      </Group>
      <Group title="Preferences">
        <GroupRow
          label="Display & Appearance"
          description="Theme, brightness, auto-sleep, layout"
          onOpen={() => onOpen('display')}
        />
        <GroupRow
          label="Alerts"
          description={alertsEnabled ? 'Notifications on' : 'Notifications off'}
          onOpen={() => onOpen('alerts')}
        />
      </Group>
    </div>
  )
}
