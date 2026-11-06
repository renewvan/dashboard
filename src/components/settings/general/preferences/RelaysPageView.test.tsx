import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { resolvedRelayGroups } from '@/lib/relayGroups'
import { renderSettings } from '@/test/renderSettings'
import type { SettingsContextValue } from '../../SettingsContext'
import type { Relay } from '@/types'

const RELAYS: Record<string, Relay> = {
  relay_01: { name: 'Ceiling', state: false },
  relay_02: { name: 'Reading', state: false },
  relay_03: { name: 'Fridge', state: false },
}

const names = (...n: string[]): string[] => n

function openRelaysPage(overrides: Partial<SettingsContextValue> = {}) {
  return renderSettings(
    { relayGroupList: resolvedRelayGroups(names('Lights', 'Appliances', 'USB')), ...overrides },
    { url: '/?page=settings&view=relays-page', bus: { relays: RELAYS } },
  )
}

const groups = () => within(screen.getByRole('list', { name: 'Groups' }))
const rowOrder = () =>
  Array.from(screen.getByRole('list', { name: 'Groups' }).querySelectorAll('li'), (li) =>
    li.getAttribute('data-group-row'),
  )

/** jsdom has no layout: give each row a 52px box on a 60px pitch. */
function layOutRows() {
  screen
    .getByRole('list', { name: 'Groups' })
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

describe('Settings › Relays page', () => {
  it('is opened from Display & Appearance › Pages', async () => {
    const { user } = renderSettings({}, { url: '/?page=settings&view=display' })

    await user.click(screen.getByRole('button', { name: /^Relays page/ }))

    expect(screen.getByRole('list', { name: 'Groups' })).toBeInTheDocument()
  })

  it('lists the shared groups in order with Unassigned last, each with its position and relays', () => {
    openRelaysPage({ relayGroups: { relay_01: 'Lights', relay_02: 'Lights', relay_03: 'USB' } })

    expect(rowOrder()).toEqual(['Lights', 'Appliances', 'USB', 'Unassigned'])
    expect(groups().getByRole('button', { name: /^Lights/ })).toHaveTextContent(
      'Position 1 of 4 · 2 relays',
    )
    expect(groups().getByRole('button', { name: /^Appliances/ })).toHaveTextContent(
      'Position 2 of 4 · 0 relays',
    )
    expect(groups().getByRole('button', { name: /^USB/ })).toHaveTextContent(
      'Position 3 of 4 · 1 relay',
    )
    expect(groups().getByRole('button', { name: /^Unassigned/ })).toHaveTextContent(
      'Position 4 of 4 · 0 relays',
    )
  })

  it('counts only the relays that are on the bus', () => {
    openRelaysPage({ relayGroups: { relay_01: 'Lights', relay_99: 'Lights' } })

    expect(groups().getByRole('button', { name: /^Lights/ })).toHaveTextContent('1 relay')
  })

  it('counts the relays with no group under Unassigned', () => {
    openRelaysPage({ relayGroups: { relay_01: 'Lights' } })

    expect(groups().getByRole('button', { name: /^Unassigned/ })).toHaveTextContent('2 relays')
  })

  it('draws Unassigned where the list puts it', () => {
    openRelaysPage({ relayGroupList: names('Unassigned', 'Lights') })

    expect(rowOrder()).toEqual(['Unassigned', 'Lights'])
  })

  it('opens a group on its own page, named for it', async () => {
    const { user } = openRelaysPage()

    await user.click(groups().getByRole('button', { name: /^Lights/ }))

    expect(window.location.search).toContain('view=relay-group')
    expect(window.location.search).toContain('group=Lights')
  })

  it('opens Unassigned too', async () => {
    const { user } = openRelaysPage()

    await user.click(groups().getByRole('button', { name: /^Unassigned/ }))

    expect(window.location.search).toContain('group=Unassigned')
  })

  describe('order of the groups', () => {
    it('drags a group down by its grip and sends the whole new list on release', async () => {
      const { user, value } = openRelaysPage({
        relayGroupList: names('Lights', 'USB', 'Unassigned'),
      })
      layOutRows()

      await user.pointer([
        {
          keys: '[MouseLeft>]',
          target: screen.getByRole('button', { name: 'Reorder Lights' }),
          coords: { clientY: 26 },
        },
        { coords: { clientY: 90 } },
        { coords: { clientY: 150 } },
      ])
      // Nothing is sent while the pointer is down.
      expect(value.setRelayGroupList).not.toHaveBeenCalled()
      await user.pointer({ keys: '[/MouseLeft]' })

      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('USB', 'Unassigned', 'Lights'),
      )
    })

    it('lets Unassigned be moved to the top', async () => {
      const { user, value } = openRelaysPage()
      layOutRows()

      await user.pointer([
        {
          keys: '[MouseLeft>]',
          target: screen.getByRole('button', { name: 'Reorder Unassigned' }),
          coords: { clientY: 206 },
        },
        { coords: { clientY: 100 } },
        { coords: { clientY: 20 } },
        { keys: '[/MouseLeft]' },
      ])

      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Unassigned', 'Lights', 'Appliances', 'USB'),
      )
    })

    it('sends nothing when a group is dropped back where it was', async () => {
      const { user, value } = openRelaysPage()
      layOutRows()

      await user.pointer([
        {
          keys: '[MouseLeft>]',
          target: screen.getByRole('button', { name: 'Reorder Appliances' }),
          coords: { clientY: 86 },
        },
        { coords: { clientY: 150 } },
        { coords: { clientY: 88 } },
        { keys: '[/MouseLeft]' },
      ])

      expect(value.setRelayGroupList).not.toHaveBeenCalled()
    })

    it('moves a group with the arrow keys on its grip, and does not apply the move itself', async () => {
      const { user, value } = openRelaysPage()

      screen.getByRole('button', { name: 'Reorder Appliances' }).focus()
      await user.keyboard('{ArrowUp}')

      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Appliances', 'Lights', 'USB', 'Unassigned'),
      )
      expect(rowOrder()).toEqual(['Lights', 'Appliances', 'USB', 'Unassigned'])
    })

    it('has no grips in Demo mode', () => {
      openRelaysPage({ demoMode: true })

      expect(screen.queryByRole('button', { name: /^Reorder/ })).not.toBeInTheDocument()
    })
  })

  describe('add', () => {
    it('adds the typed name before Unassigned and clears the field', async () => {
      const { user, value } = openRelaysPage()

      await user.type(screen.getByRole('textbox', { name: 'New group' }), 'Awning')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Lights', 'Appliances', 'USB', 'Awning', 'Unassigned'),
      )
      expect(screen.getByRole('textbox', { name: 'New group' })).toHaveValue('')
    })

    it('adds on Enter, trimmed', async () => {
      const { user, value } = openRelaysPage()

      await user.type(screen.getByRole('textbox', { name: 'New group' }), '  Awning {Enter}')

      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Lights', 'Appliances', 'USB', 'Awning', 'Unassigned'),
      )
    })

    it('adds at the end when Unassigned has been moved elsewhere', async () => {
      const { user, value } = openRelaysPage({ relayGroupList: names('Unassigned', 'Lights') })

      await user.type(screen.getByRole('textbox', { name: 'New group' }), 'Awning{Enter}')

      expect(value.setRelayGroupList).toHaveBeenCalledExactlyOnceWith(
        names('Unassigned', 'Lights', 'Awning'),
      )
    })

    it('has nothing to add until something is typed', () => {
      openRelaysPage()

      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
    })

    it('refuses a group that already exists, whatever the case, and says why', async () => {
      const { user, value } = openRelaysPage()

      await user.type(screen.getByRole('textbox', { name: 'New group' }), 'usb')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(value.setRelayGroupList).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('already exists')
    })

    it('keeps the name Unassigned for relays with no group', async () => {
      const { user, value } = openRelaysPage()

      await user.type(screen.getByRole('textbox', { name: 'New group' }), 'unassigned')
      await user.click(screen.getByRole('button', { name: 'Add' }))

      expect(value.setRelayGroupList).not.toHaveBeenCalled()
      expect(screen.getByRole('alert')).toHaveTextContent('kept for relays with no group')
    })

    it('stops at 15 groups, because Unassigned takes the hub’s sixteenth place', () => {
      openRelaysPage({
        relayGroupList: resolvedRelayGroups(
          names(...Array.from({ length: 15 }, (_, i) => `Group ${i}`)),
        ),
      })

      expect(screen.getByRole('textbox', { name: 'New group' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled()
      expect(screen.getByText(/At most 15 groups/)).toBeInTheDocument()
    })
  })
})
