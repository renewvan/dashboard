import { Group } from '../shared/Group'
import { GroupRow } from '../shared/GroupRow'
import { useSettings } from '../SettingsContext'
import type { SettingsSubView } from '../views'

interface GeneralViewProps {
  onOpen: (view: SettingsSubView) => void
}

/** General's groups, System then Preferences: each row opens its own page under a live summary. */
export function GeneralView({ onOpen }: GeneralViewProps) {
  const { alertsEnabled } = useSettings()

  return (
    <div className="flex flex-col gap-4">
      <Group title="System">
        <GroupRow
          label="Firmware"
          description="Dashboard version"
          onOpen={() => onOpen('firmware')}
        />
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
