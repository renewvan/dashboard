import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vite-plus/test'
import { resolvedRelayGroups } from '@/lib/relayGroups'
import { renderSettings } from '@/test/renderSettings'
import type { SettingsContextValue } from '../../SettingsContext'
import type { Relay } from '@/types'

const FOUR: Record<string, Relay> = {
  relay_01: { name: 'Ceiling', state: false },
  relay_02: { name: 'Reading', state: false },
  relay_03: { name: 'Fridge', state: false },
  relay_04: { name: 'Charger', state: false },
}
const ASSIGNED = {
  relay_01: 'Lights',
  relay_02: 'Lights',
  relay_03: 'Appliances',
  relay_04: 'Lights',
}

const names = (...n: string[]): string[] => n

function openGroup(
  group: string,
  overrides: Partial<SettingsContextValue> = {},
  entityIcons: Record<string, string> = {},
) {
  return renderSettings(
    {
      relayGroupList: resolvedRelayGroups(names('Lights', 'Appliances', 'USB')),
      relayGroups: ASSIGNED,
      ...overrides,
    },
    {
      url: `/?page=settings&view=relay-group&group=${group}`,
      bus: { relays: FOUR },
      entityIcons,
    },
  )
}

const rowOrder = () =>
  Array.from(screen.getByRole('list', { name: 'Relays' }).querySelectorAll('li'), (li) =>
    li.getAttribute('data-relay-row'),
  )

/** jsdom has no layout: give each row a 52px box on a 60px pitch. */
function layOutRows() {
  screen
    .getByRole('list', { name: 'Relays' })
    .querySelectorAll('li')
    .forEach((li, i) => {
      li.getBoundingClientRect = () =>
        ({
          top: i * 60,
          height: 52,
          bottom: i * 60 + 52,
          left: 0,
          right: 300,
          width: 300,
        }) as DOMRect
    })
}

describe('Settings › Relays page › a group', () => {
  it('lists the relays of that group only, in the shared order, the rest by id', () => {
    openGroup('Lights', { relayOrder: ['relay_04', 'relay_01'] })

    expect(rowOrder()).toEqual(['relay_04', 'relay_01', 'relay_02'])
  })

  it('shows a relay by its name, with its id and place beneath, like a widget row', () => {
    openGroup('Lights')

    const rows = within(screen.getByRole('list', { name: 'Relays' }))
    expect(rows.getByText('Ceiling')).toBeInTheDocument()
    expect(rows.getByText('relay_01 · Position 1 of 3')).toBeInTheDocument()
    expect(rows.getByText('relay_04 · Position 3 of 3')).toBeInTheDocument()
  })

  it('draws each relay with the icon picked for it, a power symbol until then', () => {
    openGroup('Lights', {}, { 'relay/relay_01': 'Lightbulb', 'relay/relay_02': 'NotAnIcon' })

    const rowIcon = (id: string) =>
      screen
        .getByRole('list', { name: 'Relays' })
        .querySelector(`[data-relay-row="${id}"] svg.lucide:not(.lucide-grip-vertical)`)
    expect(rowIcon('relay_01')).toHaveClass('lucide-lightbulb')
    expect(rowIcon('relay_02')).toHaveClass('lucide-power')
    expect(rowIcon('relay_04')).toHaveClass('lucide-power')
  })

  it('shows an unnamed relay by its id', () => {
    renderSettings(
      { relayGroupList: resolvedRelayGroups(names('Lights')), relayGroups: { relay_09: 'Lights' } },
      {
        url: '/?page=settings&view=relay-group&group=Lights',
        bus: { relays: { relay_09: { state: false } } },
      },
    )

    expect(
      within(screen.getByRole('list', { name: 'Relays' })).getByText('relay_09'),
    ).toBeInTheDocument()
    expect(screen.getByText('Position 1 of 1')).toBeInTheDocument()
  })

  it('says so for a group with no relay', () => {
    openGroup('USB')

    expect(screen.getByText(/No relays in this group/)).toBeInTheDocument()
  })

  describe('order', () => {
    it('drags a relay down its group and sends the whole new order on release', async () => {
      const { user, value } = openGroup('Lights')
      layOutRows()

      await user.pointer([
        {
          keys: '[MouseLeft>]',
          target: screen.getByRole('button', { name: 'Reorder Ceiling' }),
          coords: { clientY: 26 },
        },
        { coords: { clientY: 90 } },
        { coords: { clientY: 150 } },
      ])
      // Nothing is sent while the pointer is down.
      expect(value.setRelayOrder).not.toHaveBeenCalled()
      await user.pointer({ keys: '[/MouseLeft]' })

      // Ceiling goes from first to last of Lights; Fridge, in Appliances, keeps its third place.
      expect(value.setRelayOrder).toHaveBeenCalledExactlyOnceWith([
        'relay_02',
        'relay_04',
        'relay_03',
        'relay_01',
      ])
    })

    it('sends nothing when a relay is dropped back where it was', async () => {
      const { user, value } = openGroup('Lights')
      layOutRows()

      await user.pointer([
        {
          keys: '[MouseLeft>]',
          target: screen.getByRole('button', { name: 'Reorder Reading' }),
          coords: { clientY: 86 },
        },
        { coords: { clientY: 150 } },
        { coords: { clientY: 88 } },
        { keys: '[/MouseLeft]' },
      ])

      expect(value.setRelayOrder).not.toHaveBeenCalled()
    })

    it('moves a relay with the arrow keys on its grip, and does not apply the move itself', async () => {
      const { user, value } = openGroup('Lights')

      screen.getByRole('button', { name: 'Reorder Reading' }).focus()
      await user.keyboard('{ArrowUp}')

      expect(value.setRelayOrder).toHaveBeenCalledExactlyOnceWith([
        'relay_02',
        'relay_01',
        'relay_03',
        'relay_04',
      ])
      expect(rowOrder()).toEqual(['relay_01', 'relay_02', 'relay_04'])
    })

    it('has no grip for the only relay of a group', () => {
      openGroup('Appliances')

      expect(screen.queryByRole('button', { name: /^Reorder/ })).not.toBeInTheDocument()
    })

    it('has no grips in Demo mode', () => {
      openGroup('Lights', { demoMode: true })

      expect(screen.queryByRole('button', { name: /^Reorder/ })).not.toBeInTheDocument()
    })
  })

  describe('rename', () => {
    const nameField = () => screen.getByRole('textbox', { name: 'Name' })

    it('moves the relays to the new name, then sends the list with it in place', async () => {
      const { user, value } = openGroup('Lights')

      await user.clear(nameField())
      await user.type(nameField(), 'Lamps{Enter}')

      expect(value.setRelayGroup).toHaveBeenCalledTimes(3)
      expect(value.setRelayGroup).toHaveBeenCalledWith('relay_01', 'Lamps')
      expect(value.setRelayGroup).toHaveBeenCalledWith('relay_02', 'Lamps')
      expect(value.setRelayGroup).toHaveBeenCalledWith('relay_04', 'Lamps')
      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Lamps', 'Appliances', 'USB', 'Unassigned'),
      )
      // The relays move before the list does, so none is ever read as Unassigned in between.
      expect(vi.mocked(value.setRelayGroup).mock.invocationCallOrder.at(-1)).toBeLessThan(
        vi.mocked(value.setRelayGroupList).mock.invocationCallOrder[0],
      )
    })

    it('opens the group under its new name', async () => {
      const { user } = openGroup('Lights')

      await user.clear(nameField())
      await user.type(nameField(), 'Lamps{Enter}')

      expect(window.location.search).toContain('group=Lamps')
    })

    it('refuses a name another group already has, and stays where it is', async () => {
      const { user, value } = openGroup('Lights')

      await user.clear(nameField())
      await user.type(nameField(), 'USB{Enter}')

      expect(value.setRelayGroupList).not.toHaveBeenCalled()
      expect(value.setRelayGroup).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('already exists')
      expect(window.location.search).toContain('group=Lights')
    })

    it('refuses the name Unassigned', async () => {
      const { user, value } = openGroup('Lights')

      await user.clear(nameField())
      await user.type(nameField(), 'Unassigned{Enter}')

      expect(value.setRelayGroupList).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('kept for relays with no group')
    })
  })

  describe('remove', () => {
    it('clears the relays that were in it, sends the list without it and goes back', async () => {
      const { user, value } = openGroup('Lights')

      await user.click(screen.getByRole('button', { name: 'Remove group' }))

      expect(value.setRelayGroup).toHaveBeenCalledTimes(3)
      expect(value.setRelayGroup).toHaveBeenCalledWith('relay_01', null)
      expect(value.setRelayGroup).toHaveBeenCalledWith('relay_02', null)
      expect(value.setRelayGroup).toHaveBeenCalledWith('relay_04', null)
      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Appliances', 'USB', 'Unassigned'),
      )
      expect(window.location.search).toContain('view=relays-page')
      expect(window.location.search).not.toContain('group=')
    })

    it('removes an empty group without touching any relay', async () => {
      const { user, value } = openGroup('USB')

      await user.click(screen.getByRole('button', { name: 'Remove group' }))

      expect(value.setRelayGroup).not.toHaveBeenCalled()
      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Lights', 'Appliances', 'Unassigned'),
      )
    })

    it('is off in Demo mode', () => {
      openGroup('Lights', { demoMode: true })

      expect(screen.getByRole('button', { name: 'Remove group' })).toBeDisabled()
    })
  })

  describe('Unassigned', () => {
    it('lists the relays with no group, to order them, with no name field or Remove', () => {
      openGroup('Unassigned', { relayGroups: { relay_01: 'Lights' } })

      expect(rowOrder()).toEqual(['relay_02', 'relay_03', 'relay_04'])
      expect(screen.queryByRole('textbox', { name: 'Name' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Remove group' })).not.toBeInTheDocument()
    })

    it('orders them like any group', async () => {
      const { user, value } = openGroup('Unassigned', { relayGroups: { relay_01: 'Lights' } })

      screen.getByRole('button', { name: 'Reorder Charger' }).focus()
      await user.keyboard('{ArrowUp}')

      expect(value.setRelayOrder).toHaveBeenCalledExactlyOnceWith([
        'relay_01',
        'relay_02',
        'relay_04',
        'relay_03',
      ])
    })
  })

  it('falls back to the Relays page for a group that is not on the list', () => {
    openGroup('Gone')

    expect(screen.getByRole('list', { name: 'Groups' })).toBeInTheDocument()
  })
})
