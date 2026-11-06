import { useState } from 'react'
import { Button, Input, Label, TextField } from '@heroui/react'
import { panelsFor } from '@/config/relayPanels'
import { useDragReorder } from '@/hooks/useDragReorder'
import {
  addedRelayGroup,
  canAddRelayGroup,
  relayGroupNameProblem,
  reorderedRelayGroups,
  RELAY_GROUP_MAX,
} from '@/lib/relayGroups'
import { Group } from '../../shared/Group'
import { ReorderRow } from '../../shared/ReorderRow'
import { useSettingsActions, useSettingsData, useSettingsPreferences } from '../../SettingsContext'

const relayCount = (n: number) => (n === 1 ? '1 relay' : `${n} relays`)

/**
 * Settings › General › Display & Appearance › Relays page: the groups the Relays page sorts its
 * channels into, in the order it shows them. Drag a group's grip (or press the arrow keys on it) to
 * move it, Unassigned included: it is the relays with no group, so it sits wherever you put it.
 * A group opens its own page (name, icon, the order of its relays, Remove); which channel is in
 * which group is picked on each relay's Details. The list, its order and the icons are the shared
 * hub setting, so every client shows the same groups.
 */
export function RelaysPageView({ onOpen }: { onOpen: (group: string) => void }) {
  const { relays, relayGroups, relayGroupList: list, relayOrder } = useSettingsData()
  const { demoMode } = useSettingsPreferences()
  const { setRelayGroupList } = useSettingsActions()
  const [problem, setProblem] = useState<string>()
  const [draft, setDraft] = useState('')

  const panels = panelsFor(Object.keys(relays), relayGroups, list, relayOrder)
  const countOf = (title: string) => panels.find((panel) => panel.title === title)?.ids.length ?? 0

  const move = (from: number, to: number) => setRelayGroupList(reorderedRelayGroups(list, from, to))
  const { rowRef, rowStyle, handleProps, draggingIndex } = useDragReorder(list.length, move)

  const add = () => {
    const name = draft.trim()
    const why = relayGroupNameProblem(name, list)
    setProblem(why)
    if (why !== undefined) return
    setRelayGroupList(addedRelayGroup(list, name))
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted px-1 text-sm">
        The groups of the Relays page, in the order it shows them. Drag the grip to reorder,
        Unassigned included.
      </p>
      <Group title="Groups">
        <ul aria-label="Groups" className="flex flex-col gap-2">
          {list.map((name, i) => (
            <li key={name} ref={rowRef(i)} style={rowStyle(i)} data-group-row={name}>
              <ReorderRow
                label={name}
                description={`Position ${i + 1} of ${list.length} · ${relayCount(countOf(name))}`}
                onOpen={() => onOpen(name)}
                grip={
                  demoMode
                    ? undefined
                    : {
                        props: handleProps(i),
                        dragging: draggingIndex === i,
                        onKeyDown: (key) => move(i, i + (key === 'ArrowUp' ? -1 : 1)),
                      }
                }
              />
            </li>
          ))}
        </ul>
        <p className="text-muted px-1 text-sm">
          A relay with no group, or whose group you remove, shows under Unassigned.
        </p>
      </Group>
      <Group title="Add a group">
        <div className="border-border bg-surface flex items-end gap-2 rounded-2xl border px-3.5 py-3">
          <TextField
            className="min-w-0 flex-1"
            value={draft}
            isDisabled={!canAddRelayGroup(list)}
            onChange={(next) => {
              setDraft(next)
              setProblem(undefined)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add()
            }}
          >
            <Label>New group</Label>
            <Input variant="secondary" fullWidth />
          </TextField>
          <Button isDisabled={!canAddRelayGroup(list) || draft.trim() === ''} onPress={add}>
            Add
          </Button>
        </div>
        {!canAddRelayGroup(list) && (
          <p className="text-muted px-1 text-sm">
            At most {RELAY_GROUP_MAX} groups, besides Unassigned.
          </p>
        )}
        {problem !== undefined && (
          <p role="alert" className="text-danger px-1 text-sm">
            {problem}
          </p>
        )}
      </Group>
    </div>
  )
}
