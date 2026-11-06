import { describe, expect, it } from 'vite-plus/test'
import {
  addedRelayGroup,
  canAddRelayGroup,
  ownGroups,
  relayGroupNameProblem,
  renamedRelayGroups,
  reorderedRelayGroups,
  resolvedRelayGroups,
  withoutRelayGroup,
} from './relayGroups'

const g = (...names: string[]) => names

describe('relayGroupNameProblem', () => {
  const list = g('Lights', 'USB')

  it('accepts a new name', () => {
    expect(relayGroupNameProblem('Awning', list)).toBeUndefined()
  })

  it('refuses an empty name and one with a space at either end', () => {
    expect(relayGroupNameProblem('', list)).toBeDefined()
    expect(relayGroupNameProblem('   ', list)).toBeDefined()
    expect(relayGroupNameProblem(' Awning', list)).toBeDefined()
    expect(relayGroupNameProblem('Awning ', list)).toBeDefined()
  })

  it('accepts 32 characters and refuses 33, counting characters and not bytes', () => {
    expect(relayGroupNameProblem('x'.repeat(32), list)).toBeUndefined()
    expect(relayGroupNameProblem('x'.repeat(33), list)).toBeDefined()
    expect(relayGroupNameProblem('é'.repeat(32), list)).toBeUndefined()
  })

  it('refuses a name already in the list, without regard to case', () => {
    expect(relayGroupNameProblem('USB', list)).toBeDefined()
    expect(relayGroupNameProblem('usb', list)).toBeDefined()
  })

  it('keeps Unassigned for relays with no group, whatever the case', () => {
    expect(relayGroupNameProblem('Unassigned', list)).toBeDefined()
    expect(relayGroupNameProblem('unassigned', list, 'USB')).toBeDefined()
  })

  it('lets a rename keep its own name or change only its case', () => {
    expect(relayGroupNameProblem('USB', list, 'USB')).toBeUndefined()
    expect(relayGroupNameProblem('usb', list, 'USB')).toBeUndefined()
    expect(relayGroupNameProblem('Lights', list, 'USB')).toBeDefined()
  })
})

describe('Unassigned in the list', () => {
  it('is last until the list holds an entry for it', () => {
    expect(resolvedRelayGroups(g('A', 'B'))).toEqual(g('A', 'B', 'Unassigned'))
  })

  it('stays where the owner put it', () => {
    expect(resolvedRelayGroups(g('Unassigned', 'A'))).toEqual(g('Unassigned', 'A'))
  })

  it('is not one of the groups the owner made', () => {
    expect(ownGroups(g('A', 'Unassigned', 'B'))).toEqual(g('A', 'B'))
  })

  it('does not count toward the groups that can be added, but the hub limit of 16 does', () => {
    const fifteen = g(...Array.from({ length: 15 }, (_, i) => `G${i}`))
    expect(canAddRelayGroup(fifteen)).toBe(false)
    expect(canAddRelayGroup(fifteen.slice(0, 14))).toBe(true)
    expect(canAddRelayGroup([...fifteen, 'Unassigned'])).toBe(false)
    expect(
      canAddRelayGroup(g(...Array.from({ length: 14 }, (_, i) => `G${i}`), 'Unassigned')),
    ).toBe(true)
  })
})

describe('the list edits', () => {
  it('adds a group before Unassigned when that is last, else at the end', () => {
    expect(addedRelayGroup(g('A'), 'X')).toEqual(g('A', 'X', 'Unassigned'))
    expect(addedRelayGroup(g('A', 'Unassigned'), 'X')).toEqual(g('A', 'X', 'Unassigned'))
    expect(addedRelayGroup(g('Unassigned', 'A'), 'X')).toEqual(g('Unassigned', 'A', 'X'))
  })

  it('renames in place', () => {
    expect(renamedRelayGroups(g('A', 'B', 'C'), 'B', 'X')).toEqual(g('A', 'X', 'C'))
  })

  it('removes a group', () => {
    expect(withoutRelayGroup(g('A', 'B'), 'A')).toEqual(g('B'))
  })

  it('moves a group to a place, and changes nothing out of range or to the same place', () => {
    expect(reorderedRelayGroups(g('A', 'B', 'C'), 0, 2)).toEqual(g('B', 'C', 'A'))
    expect(reorderedRelayGroups(g('A', 'B', 'C'), 2, 0)).toEqual(g('C', 'A', 'B'))
    expect(reorderedRelayGroups(g('A', 'B', 'C'), 1, 1)).toEqual(g('A', 'B', 'C'))
    expect(reorderedRelayGroups(g('A', 'B', 'C'), 0, 3)).toEqual(g('A', 'B', 'C'))
    expect(reorderedRelayGroups(g('A', 'B', 'C'), -1, 0)).toEqual(g('A', 'B', 'C'))
  })

  it('does not change the list it is given', () => {
    const list = g('A', 'B')
    reorderedRelayGroups(list, 0, 1)
    renamedRelayGroups(list, 'A', 'X')
    addedRelayGroup(list, 'X')
    expect(list).toEqual(g('A', 'B'))
  })
})
