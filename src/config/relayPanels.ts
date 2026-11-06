import { Power, type LucideIcon } from 'lucide-react'
import { resolvedRelayGroups, UNASSIGNED_GROUP } from '@/lib/relayGroups'
import { sortByRelayOrder } from '@/lib/relayOrder'

/**
 * Dashboard-local presentation config for the Relays page, keyed by channel id. Which groups exist
 * and which channel is in which are NOT here: they are shared settings on the bus
 * (`renewvan/hub/relay-group-list` and `renewvan/hub/relay-groups`, hub ADR 0028), edited in
 * Settings › General › Display & Appearance › Relays page and Settings › Devices › Relays. What is
 * left here is the part nothing on the bus carries yet. It ships EMPTY on purpose: which load a
 * channel switches, and which loads are critical, are the owner's to say, and an icon is only as
 * honest as the channel's name: a guess would label a pump as a light. To configure the van, fill
 * these in:
 *
 *   icons:    { relay_03: Droplets }
 *   critical: ['relay_03']
 */

/** Per-channel icons, only for a load the owner has named. */
export const relayIcons: Record<string, LucideIcon> = {}

/** Loads that ask for confirmation before switching (a pump, a heater, an inverter enable). */
export const criticalRelayIds: string[] = []

/** Shown for a channel with no honest icon, so the page never guesses what it switches. */
export const FALLBACK_RELAY_ICON: LucideIcon = Power

export interface RelayPanel {
  title: string
  /** Channel ids to show, in the shared relay order (the rest by id); only ids that are on the bus. */
  ids: string[]
}

/**
 * Places every channel on the bus in a panel. A channel goes in the group the bus holds for it
 * (`assignments`: relay id to group name) when that group is in `list`; any other channel goes to
 * Unassigned, so a new relay, and one whose group was removed, always appears. An entry for a relay
 * that is not on the bus is ignored, and so is a group with no channel. Panels run in the order of
 * `list`, Unassigned wherever its entry sits (last when it has none); the channels in a panel
 * follow `order` (the shared relay order), with any it does not list after, by id.
 */
export function panelsFor(
  ids: readonly string[],
  assignments: Readonly<Record<string, string>>,
  list: readonly string[],
  order: readonly string[] = [],
): RelayPanel[] {
  const groups = resolvedRelayGroups(list)
  const offered = new Set(groups)
  const rest: string[] = []
  const members = new Map<string, string[]>()
  for (const id of ids) {
    const group = Object.hasOwn(assignments, id) ? assignments[id] : undefined
    if (group === undefined || group === UNASSIGNED_GROUP || !offered.has(group)) {
      rest.push(id)
      continue
    }
    members.set(group, [...(members.get(group) ?? []), id])
  }
  return groups.flatMap((title) => {
    const own = title === UNASSIGNED_GROUP ? rest : (members.get(title) ?? [])
    return own.length === 0 ? [] : [{ title, ids: sortByRelayOrder(own, order) }]
  })
}
