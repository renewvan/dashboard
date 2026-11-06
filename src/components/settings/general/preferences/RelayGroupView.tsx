import { useState } from 'react'
import { Button } from '@heroui/react'
import { Power } from 'lucide-react'
import { panelsFor, type RelayPanel } from '@/config/relayPanels'
import { useDragReorder } from '@/hooks/useDragReorder'
import { useEntityIcons } from '@/hooks/useEntityIcon'
import { entityIcon, iconKey } from '@/lib/entityIcons'
import {
  relayGroupNameProblem,
  renamedRelayGroups,
  withoutRelayGroup,
  RELAY_GROUP_NAME_MAX,
  UNASSIGNED_GROUP,
} from '@/lib/relayGroups'
import { reorderedRelayOrder } from '@/lib/relayOrder'
import type { Relay } from '@/types'
import { Group } from '../../shared/Group'
import { NameField } from '../../shared/NameField'
import { ReorderRow } from '../../shared/ReorderRow'
import { useSettingsActions, useSettingsData, useSettingsPreferences } from '../../SettingsContext'

interface RelayOrderListProps {
  panel: RelayPanel
  relays: Record<string, Relay>
  /** Moves the relay at `from` to `to` inside this group; absent when the order cannot be changed. */
  onMove?: (from: number, to: number) => void
}

/**
 * The group's relays, in the order the Relays page shows them, as the Widgets page lists its
 * widgets: drag a row's grip, or press the arrow keys on it, to move the relay inside the group. A
 * group with one relay has nothing to order, so its row has no grip.
 */
function RelayOrderList({ panel, relays, onMove }: RelayOrderListProps) {
  const { rowRef, rowStyle, handleProps, draggingIndex } = useDragReorder(
    panel.ids.length,
    (from, to) => onMove?.(from, to),
  )
  const orderable = onMove !== undefined && panel.ids.length > 1
  const sharedIcons = useEntityIcons()
  return (
    <ul aria-label="Relays" className="flex flex-col gap-2">
      {panel.ids.map((id, i) => {
        const named = relays[id]?.name !== undefined
        const Icon = entityIcon(sharedIcons[iconKey('relay', id)]) ?? Power
        return (
          <li key={id} ref={rowRef(i)} style={rowStyle(i)} data-relay-row={id}>
            <ReorderRow
              icon={<Icon className="size-6" />}
              label={relays[id]?.name ?? id}
              description={`${named ? `${id} · ` : ''}Position ${i + 1} of ${panel.ids.length}`}
              grip={
                orderable
                  ? {
                      props: handleProps(i),
                      dragging: draggingIndex === i,
                      onKeyDown: (key) => onMove(i, i + (key === 'ArrowUp' ? -1 : 1)),
                    }
                  : undefined
              }
            />
          </li>
        )
      })}
    </ul>
  )
}

interface RelayGroupViewProps {
  /** The group's name: one on the shared list, Unassigned included. */
  name: string
  /** The group was renamed: open it under its new name. */
  onRenamed: (name: string) => void
  /** The group was removed: there is nothing left to show. */
  onRemoved: () => void
}

/**
 * Settings › General › Display & Appearance › Relays page › a group: the relays in it, in the order
 * the Relays page shows them (drag the grip to change it), and for a group the owner made its name
 * and a Remove button. Unassigned is every relay with no group, so it has an order but no name to
 * change and cannot be removed. The hub leaves the assignments
 * alone when the list changes, so renaming moves the group's relays to the new name and removing
 * clears them (they show under Unassigned), here, before the list is sent.
 */
export function RelayGroupView({ name, onRenamed, onRemoved }: RelayGroupViewProps) {
  const { relays, relayGroups, relayGroupList: list, relayOrder } = useSettingsData()
  const { demoMode } = useSettingsPreferences()
  const { setRelayGroup, setRelayGroupList, setRelayOrder } = useSettingsActions()
  const [problem, setProblem] = useState<string>()

  const relayIds = Object.keys(relays)
  const panel = panelsFor(relayIds, relayGroups, list, relayOrder).find((p) => p.title === name)
  const isUnassigned = name === UNASSIGNED_GROUP

  /** Every relay entry the hub holds for the group, including one whose relay is off the bus. */
  const membersOf = (groupName: string) =>
    Object.keys(relayGroups).filter((id) => relayGroups[id] === groupName)

  const rename = (to: string) => {
    const why = relayGroupNameProblem(to, list, name)
    setProblem(why)
    if (why !== undefined) return
    for (const id of membersOf(name)) setRelayGroup(id, to)
    setRelayGroupList(renamedRelayGroups(list, name, to))
    onRenamed(to)
  }

  const remove = () => {
    for (const id of membersOf(name)) setRelayGroup(id, null)
    setRelayGroupList(withoutRelayGroup(list, name))
    onRemoved()
  }

  return (
    <div className="flex flex-col gap-4">
      {!isUnassigned && (
        <Group title="Name">
          <div className="border-border bg-surface rounded-2xl border px-3.5 py-3">
            <NameField
              name={name}
              maxBytes={RELAY_GROUP_NAME_MAX}
              isDisabled={demoMode}
              onCommit={rename}
            />
          </div>
          {problem !== undefined && (
            <p role="alert" className="text-danger px-1 text-sm">
              {problem}
            </p>
          )}
        </Group>
      )}
      <Group title="Relays">
        {panel === undefined ? (
          <p className="text-muted px-1 text-sm">
            {isUnassigned
              ? 'Every relay is in a group.'
              : 'No relays in this group. Pick it on a relay under Settings › Devices › Relays.'}
          </p>
        ) : (
          <>
            {panel.ids.length > 1 && (
              <p className="text-muted px-1 text-sm">
                Drag the grip to put the relays in the order the Relays page shows them.
              </p>
            )}
            <RelayOrderList
              panel={panel}
              relays={relays}
              onMove={
                demoMode
                  ? undefined
                  : (from, to) =>
                      setRelayOrder(reorderedRelayOrder(relayIds, relayOrder, panel.ids, from, to))
              }
            />
          </>
        )}
      </Group>
      {!isUnassigned && (
        <Group title="Remove">
          <Button
            variant="danger"
            fullWidth
            className="min-h-11"
            isDisabled={demoMode}
            onPress={remove}
          >
            Remove group
          </Button>
          <p className="text-muted px-1 text-sm">
            Its relays are not deleted: they show under Unassigned.
          </p>
        </Group>
      )}
    </div>
  )
}
