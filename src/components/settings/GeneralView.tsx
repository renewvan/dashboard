import { GroupRow } from './GroupRow'
import { useSettings } from './SettingsContext'

interface GeneralViewProps {
  onOpen: (view: 'alerts' | 'display') => void
}

/** General's rows: each opens its own page under a live summary. */
export function GeneralView({ onOpen }: GeneralViewProps) {
  const { alertsEnabled } = useSettings()

  return (
    <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
      <GroupRow
        label="Alerts"
        description={alertsEnabled ? 'Notifications on' : 'Notifications off'}
        onOpen={() => onOpen('alerts')}
      />
      <GroupRow
        label="Display"
        description="Brightness, auto-sleep, navigation"
        onOpen={() => onOpen('display')}
      />
    </div>
  )
}
