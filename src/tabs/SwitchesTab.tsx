import { RelayRow } from '../components/RelayRow'
import { relayLabel } from '../config/relayLabels'
import type { Relay } from '../types'

export interface SwitchesTabProps {
  relays: Record<string, Relay>
}

export function SwitchesTab({ relays }: SwitchesTabProps) {
  const ids = Object.keys(relays).sort()

  if (ids.length === 0) {
    return <p className="empty-state">No relay data yet.</p>
  }

  return (
    <div className="relay-list">
      {ids.map((id) => (
        <RelayRow key={id} label={relayLabel(id)} state={relays[id].state} />
      ))}
    </div>
  )
}
