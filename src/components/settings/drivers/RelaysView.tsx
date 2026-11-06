import { useId } from 'react'
import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { useEntityIcon } from '@/hooks/useEntityIcon'
import { RELAY_ICON_NAMES } from '@/lib/entityIcons'
import { instanceKey } from '@/lib/instances'
import { ownGroups } from '@/lib/relayGroups'
import { EntityCard } from '../shared/EntityCard'
import { relaySummary } from './entitySummary'
import { IconPicker } from '../shared/IconPicker'
import { NameField } from '../shared/NameField'
import { useSettingsData, useSettingsActions } from '../SettingsContext'

/**
 * The longest name the ESP32 relay driver stores, in UTF-8 bytes (hub ADR 0013: 63 by default, 254 to
 * 255 at most). The driver silently drops a longer one, so the field refuses to send it.
 */
const RELAY_NAME_MAX_BYTES = 63

/** The key of the "no group" button: group names never start with a space, so it cannot collide. */
const NO_GROUP = ' none'

/**
 * Which group the Relays page files the channel under. The choice is the shared hub setting, so a
 * tap sends the command and nothing changes until the hub plugin answers with the retained map.
 * The buttons are the shared list of groups (edited in Settings › Display & Appearance › Relays page).
 */
function GroupPicker({ id, group }: { id: string; group: string | undefined }) {
  const { relayGroupList } = useSettingsData()
  const { setRelayGroup } = useSettingsActions()
  // A group that has left the list reads as no group: the Relays page files the channel under Unassigned.
  const offered = ownGroups(relayGroupList)
  const current = group !== undefined && offered.includes(group) ? group : NO_GROUP

  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-muted pt-2 text-xs">Group</span>
      <ToggleButtonGroup
        aria-label="Group"
        selectionMode="single"
        disallowEmptySelection
        selectedKeys={new Set([current])}
        onSelectionChange={(keys) => {
          const key = [...keys][0]
          if (key === undefined) return
          const next = String(key)
          // HeroUI re-fires the selection on a re-tap of the selected item: send nothing.
          if (next === current) return
          setRelayGroup(id, next === NO_GROUP ? null : next)
        }}
        className="flex-wrap justify-end"
      >
        <ToggleButton id={NO_GROUP}>None</ToggleButton>
        {offered.map((name) => (
          <ToggleButton key={name} id={name}>
            {name}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  )
}

/** Settings › Devices › Relays › <channel> › Details: rename the channel, pick its icon and its group. */
export function RelayDetails({ id }: { id: string }) {
  const { relays, relayGroups } = useSettingsData()
  if (relays[id] === undefined) return null
  return <RelayPanel id={id} name={relays[id].name} group={relayGroups[id]} />
}

function RelayPanel({
  id,
  name,
  group,
}: {
  id: string
  name: string | undefined
  group: string | undefined
}) {
  const { setRelayName, setEntityIcon } = useSettingsActions()
  const icon = useEntityIcon('relay', id)
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
      <IconPicker
        names={RELAY_ICON_NAMES}
        value={icon}
        onChange={(next) => setEntityIcon('relay', id, next)}
      />
      <GroupPicker id={id} group={group} />
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
