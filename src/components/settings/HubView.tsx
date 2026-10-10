import { BUS_TONE, busStatusText } from '@/lib/connection'
import { DetailList, StatusRow } from './DetailList'
import { useSettings } from './SettingsContext'

/** The kiosk's live link to the van's broker (the Bus link). */
export function HubView() {
  const { busStatus } = useSettings()

  return (
    <DetailList label="Hub">
      <StatusRow label="Bus link" tone={BUS_TONE[busStatus]} text={busStatusText(busStatus)} />
    </DetailList>
  )
}
