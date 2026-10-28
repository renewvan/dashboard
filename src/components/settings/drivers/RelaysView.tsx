import { useId } from 'react'
import { instanceKey } from '@/lib/instances'
import { EntityCard } from '../shared/EntityCard'
import { relaySummary } from './entitySummary'
import { NameField } from '../shared/NameField'
import { useSettingsData, useSettingsActions } from '../SettingsContext'

/**
 * The longest name the ESP32 relay driver stores, in UTF-8 bytes (hub ADR 0013: 63 by default, 254 to
 * 255 at most). The driver silently drops a longer one, so the field refuses to send it.
 */
const RELAY_NAME_MAX_BYTES = 63

/** Settings › Devices › Relays › <channel> › Details: rename the channel. */
export function RelayDetails({ id }: { id: string }) {
  const { relays } = useSettingsData()
  if (relays[id] === undefined) return null
  return <RelayPanel id={id} name={relays[id].name} />
}

function RelayPanel({ id, name }: { id: string; name: string | undefined }) {
  const { setRelayName } = useSettingsActions()
  const labelId = useId()

  return (
    <div
      role="group"
      aria-labelledby={labelId}
      className="border-border bg-surface flex flex-col gap-3 rounded-2xl border px-3.5 py-3"
    >
      <span id={labelId} className="text-muted text-xs">
        {id}
      </span>
      <NameField
        name={name}
        maxBytes={RELAY_NAME_MAX_BYTES}
        onCommit={(next) => setRelayName(id, next)}
      />
    </div>
  )
}

/** Settings › Devices › Relays: one card per channel, each opening its Details. Switching is on the Relays page. */
export function RelaysView({ onOpen }: { onOpen: (key: string) => void }) {
  const { relays } = useSettingsData()
  // `numeric` keeps relay_9 before relay_10 for an id that is not zero-padded.
  const ids = Object.keys(relays).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))

  if (ids.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No relays found. Waiting for the relay driver to publish.
      </p>
    )
  }

  return (
    <ul aria-label="Relays" className="flex flex-col gap-2">
      {ids.map((id) => (
        <li key={id}>
          <EntityCard
            label={relays[id].name || id}
            subtitle={relays[id].name ? id : undefined}
            summary={relaySummary(relays[id])}
            onOpen={() => onOpen(instanceKey('relay', id))}
          />
        </li>
      ))}
    </ul>
  )
}
