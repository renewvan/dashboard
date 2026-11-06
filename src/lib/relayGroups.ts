/**
 * The groups of the Relays page. The list of group names, and its order, is one shared hub setting
 * (`renewvan/hub/relay-group-list`, hub ADR 0028) the owner edits in Settings. A group is text: it
 * has no icon.
 */

/** What the Relays page calls the channels in no group. A group cannot take the name. */
export const UNASSIGNED_GROUP = 'Unassigned'

/** What a hub that has not published a list (an older plugin, or one not heard from yet) means. */
export const DEFAULT_RELAY_GROUP_LIST: readonly string[] = [
  'Lights',
  'Appliances',
  'USB',
  'Water',
  'Heating',
]

/** The hub's limits (`schema/hub-relay-group-list.schema.json`). */
export const RELAY_GROUP_NAME_MAX = 32
export const RELAY_GROUP_LIST_MAX = 16

/** The most groups the owner can add: the list also holds Unassigned, which counts toward the hub's limit. */
export const RELAY_GROUP_MAX = RELAY_GROUP_LIST_MAX - 1

/**
 * The list with Unassigned in it: the hub's list holds the name only once the owner has moved it,
 * and until then it is last.
 */
export function resolvedRelayGroups(list: readonly string[]): string[] {
  return list.includes(UNASSIGNED_GROUP) ? [...list] : [...list, UNASSIGNED_GROUP]
}

/** The groups the owner made: the list without Unassigned. */
export function ownGroups(list: readonly string[]): string[] {
  return list.filter((name) => name !== UNASSIGNED_GROUP)
}

const sameName = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/**
 * Why a group name cannot be used, or `undefined` when it can. `list` is the current list and
 * `renaming` the name being replaced (so keeping a name, or changing only its case, is allowed).
 * The name is compared without regard to case, so "usb" cannot sit beside "USB", and Unassigned is
 * kept for the relays with no group.
 */
export function relayGroupNameProblem(
  name: string,
  list: readonly string[],
  renaming?: string,
): string | undefined {
  if (name.trim() === '') return 'Enter a name.'
  if (name !== name.trim()) return 'A name cannot start or end with a space.'
  // Code points, not graphemes: the hub plugin's limit is Python's len(), a count of code points.
  // oxlint-disable-next-line typescript/no-misused-spread
  if ([...name].length > RELAY_GROUP_NAME_MAX)
    return `A name is at most ${RELAY_GROUP_NAME_MAX} characters.`
  if (sameName(name, UNASSIGNED_GROUP))
    return `${UNASSIGNED_GROUP} is kept for relays with no group.`
  if (list.some((other) => other !== renaming && sameName(other, name)))
    return 'That group already exists.'
  return undefined
}

export function canAddRelayGroup(list: readonly string[]): boolean {
  return ownGroups(list).length < RELAY_GROUP_MAX
}

/** The list with a new group added: before Unassigned when that is last, else at the end. */
export function addedRelayGroup(list: readonly string[], name: string): string[] {
  const next = resolvedRelayGroups(list)
  const last = next.length - 1
  next.splice(next[last] === UNASSIGNED_GROUP ? last : next.length, 0, name)
  return next
}

/** The list with `from` renamed to `to`, in place. */
export function renamedRelayGroups(list: readonly string[], from: string, to: string): string[] {
  return list.map((name) => (name === from ? to : name))
}

/** The list without a group. */
export function withoutRelayGroup(list: readonly string[], name: string): string[] {
  return list.filter((other) => other !== name)
}

/** The list with the group at `from` moved to `to`; unchanged when either is out of range. */
export function reorderedRelayGroups(list: readonly string[], from: number, to: number): string[] {
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < list.length
  if (!inRange(from) || !inRange(to) || from === to) return [...list]
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
