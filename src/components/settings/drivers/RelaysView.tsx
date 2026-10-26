import { useId } from 'react'
import { NameField } from '../shared/NameField'
import { useSettingsData, useSettingsActions } from '../SettingsContext'

/**
 * The longest name the ESP32 relay driver stores, in UTF-8 bytes (hub ADR 0013: 63 by default, 254 to
 * 255 at most). The driver silently drops a longer one, so the field refuses to send it.
 */
const RELAY_NAME_MAX_BYTES = 63

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

/** Settings › Drivers › Relays: rename a channel. Switching is on the Relays page, not here. */
export function RelaysView() {
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
    <div className="flex flex-col gap-3">
      {ids.map((id) => (
        <RelayPanel key={id} id={id} name={relays[id].name} />
      ))}
    </div>
  )
}
