import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { SettingsPage } from '../SettingsPage'
import { SettingsProvider } from '../SettingsProvider'
import { settingsSlices } from '@/test/settingsSlices'
import type { SettingsContextValue } from '../SettingsContext'
import { renderSettings } from '@/test/renderSettings'
import type { DriverInfo, Relay } from '@/types'

const relayInfo: DriverInfo = {
  driver: 'esp32-16x-relay',
  product: 'ESP32 16-channel relay board',
  source: 'ESP32 with two chained SN74HC595 shift registers',
  publishes: ['relay'],
  version: 'v0.1.0',
}

/** Opens Settings › Devices › the relay Driver › Relays, with the relays on the bus. */
async function openRelays(
  relays: Record<string, Relay>,
  overrides: Partial<SettingsContextValue> = {},
  /** Which channel's card to open Details on, in the order the list shows them. */
  card = 0,
  /** The shared entity icons on the bus (`renewvan/hub/icons`). */
  entityIcons: Record<string, string> = {},
) {
  const rendered = renderSettings(overrides, {
    bus: { relays, drivers: { 'esp32-16x-relay': { info: relayInfo, health: 'online' } } },
    entityIcons,
  })
  await rendered.user.click(screen.getByRole('button', { name: /^Devices/ }))
  await rendered.user.click(screen.getByRole('button', { name: /^ESP32 16x Relay/ }))
  await rendered.user.click(
    within(screen.getByRole('list', { name: 'Entities' })).getByRole('button', {
      name: /^Relays/,
    }),
  )
  await rendered.user.click(
    within(screen.getByRole('list', { name: 'Relays' })).getAllByRole('button')[card],
  )
  return rendered
}

const nameField = (id: string) =>
  within(screen.getByRole('group', { name: id })).getByRole('textbox', { name: 'Name' })

const PUMP: Relay = { name: 'Water pump', state: false }

describe('Settings › Devices › Relays', () => {
  it('lists a card per relay by id, sorted, each opening its own name field', async () => {
    const { user } = await openRelays(
      { relay_10: { name: 'Heater' }, relay_02: PUMP, relay_03: { state: true } },
      {},
      0,
    )
    expect(nameField('relay_02')).toHaveValue('Water pump')

    await user.click(screen.getByRole('button', { name: 'Relays' }))

    const list = within(screen.getByRole('list', { name: 'Relays' }))
    expect(list.getAllByRole('button').map((row) => row.textContent)).toEqual([
      'Water pumprelay_02Off',
      'relay_03On',
      'Heaterrelay_10',
    ])
  })

  it('lets an unnamed channel be named: an unconfigured relay is exactly what is renamed', async () => {
    const { user, value } = await openRelays({ relay_04: { state: true } })
    const field = nameField('relay_04')

    expect(field).toBeEnabled()
    await user.type(field, 'Kitchen light{Enter}')

    expect(value.setRelayName).toHaveBeenCalledExactlyOnceWith('relay_04', 'Kitchen light')
  })

  it('says so when no relay has published', async () => {
    const { user } = renderSettings(
      {},
      { bus: { drivers: { 'esp32-16x-relay': { info: relayInfo, health: 'online' } } } },
    )
    await user.click(screen.getByRole('button', { name: /^Devices/ }))
    await user.click(screen.getByRole('button', { name: /^ESP32 16x Relay/ }))

    // With no relay on the bus the Driver lists no Relays row to open.
    expect(screen.queryByRole('button', { name: /^Relays/ })).not.toBeInTheDocument()
  })

  describe('rename', () => {
    it('commits once, on Enter, trimmed, and nothing is sent while typing', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.clear(field)
      await user.type(field, '  Fresh pump ')

      expect(value.setRelayName).not.toHaveBeenCalled()

      await user.keyboard('{Enter}')

      expect(value.setRelayName).toHaveBeenCalledExactlyOnceWith('relay_03', 'Fresh pump')
    })

    it('commits on leaving the field, once', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.clear(field)
      await user.type(field, 'Pump')
      await user.tab()

      expect(value.setRelayName).toHaveBeenCalledExactlyOnceWith('relay_03', 'Pump')
    })

    it('sends nothing when the name is unchanged or cleared to empty', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.click(field)
      await user.tab()
      await user.clear(field)
      await user.tab()

      expect(value.setRelayName).not.toHaveBeenCalled()
    })

    it('does not apply the new name itself: it shows the stored one until the board echoes it', async () => {
      const { user, rerender, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.clear(field)
      await user.type(field, 'Pump{Enter}')

      expect(value.setRelayName).toHaveBeenCalledExactlyOnceWith('relay_03', 'Pump')
      expect(field).toHaveValue('Water pump')

      rerender(
        <SettingsProvider
          {...settingsSlices({ ...value, relays: { relay_03: { ...PUMP, name: 'Pump' } } })}
        >
          <SettingsPage />
        </SettingsProvider>,
      )
      expect(nameField('relay_03')).toHaveValue('Pump')
    })

    it('shows the old name again when the board rejected the rename and echoes nothing', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.clear(field)
      await user.type(field, 'x'.repeat(64) + '{Enter}')

      expect(value.setRelayName).not.toHaveBeenCalled()
      expect(nameField('relay_03')).toHaveValue('Water pump')
    })
  })

  it('lists Icon before Group, under the name', async () => {
    await openRelays({ relay_03: PUMP })

    const panel = screen.getByRole('group', { name: 'relay_03' })
    const order = Array.from(panel.querySelectorAll('[role="radiogroup"]'), (el) =>
      el.getAttribute('aria-label'),
    )
    expect(order).toEqual(['Icon', 'Group'])
  })

  describe('icon', () => {
    const picker = () => within(screen.getByRole('radiogroup', { name: 'Icon' }))

    it('offers the icons for a load, none pressed until one is picked', async () => {
      await openRelays({ relay_03: PUMP })

      expect(picker().getByRole('radio', { name: 'Lightbulb' })).toBeInTheDocument()
      expect(picker().getByRole('radio', { name: 'Fan' })).toBeInTheDocument()
      for (const radio of picker().getAllByRole('radio')) expect(radio).not.toBeChecked()
    })

    it('sends the icon for this relay when one is picked, and nothing changes yet', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })

      await user.click(picker().getByRole('radio', { name: 'Droplet' }))

      expect(value.setEntityIcon).toHaveBeenCalledExactlyOnceWith('relay', 'relay_03', 'Droplet')
      expect(picker().getByRole('radio', { name: 'Droplet' })).not.toBeChecked()
    })

    it('shows the icon the hub holds for this relay only', async () => {
      await openRelays({ relay_03: PUMP, relay_04: { name: 'Other' } }, {}, 1, {
        'relay/relay_03': 'Fan',
        'relay/relay_04': 'Zap',
      })

      expect(picker().getByRole('radio', { name: 'Zap' })).toBeChecked()
      expect(picker().getByRole('radio', { name: 'Fan' })).not.toBeChecked()
    })

    it('sends nothing when the pressed icon is tapped again', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP }, {}, 0, {
        'relay/relay_03': 'Fan',
      })

      await user.click(picker().getByRole('radio', { name: 'Fan' }))

      expect(value.setEntityIcon).not.toHaveBeenCalled()
    })
  })

  describe('group', () => {
    const picker = () => within(screen.getByRole('radiogroup', { name: 'Group' }))

    it('offers None and each group, with the channel in none of them until the hub says so', async () => {
      await openRelays({ relay_03: PUMP })

      expect(
        picker()
          .getAllByRole('radio')
          .map((radio) => radio.textContent),
      ).toEqual(['None', 'Lights', 'Appliances', 'USB', 'Water', 'Heating'])
      expect(picker().getByRole('radio', { name: 'None' })).toBeChecked()
    })

    it('sends the group for this channel when one is picked, and nothing else changes yet', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })

      await user.click(picker().getByRole('radio', { name: 'Water' }))

      expect(value.setRelayGroup).toHaveBeenCalledExactlyOnceWith('relay_03', 'Water')
      // Nothing is applied until the hub plugin answers with the retained map.
      expect(picker().getByRole('radio', { name: 'None' })).toBeChecked()
    })

    it('shows the group the hub holds for the channel', async () => {
      await openRelays({ relay_03: PUMP }, { relayGroups: { relay_03: 'USB' } })

      expect(picker().getByRole('radio', { name: 'USB' })).toBeChecked()
    })

    it('sends null for None, which takes the channel back to Unassigned', async () => {
      const { user, value } = await openRelays(
        { relay_03: PUMP },
        { relayGroups: { relay_03: 'USB' } },
      )

      await user.click(picker().getByRole('radio', { name: 'None' }))

      expect(value.setRelayGroup).toHaveBeenCalledExactlyOnceWith('relay_03', null)
    })

    it('sends nothing when the picked group is tapped again', async () => {
      const { user, value } = await openRelays(
        { relay_03: PUMP },
        { relayGroups: { relay_03: 'USB' } },
      )

      await user.click(picker().getByRole('radio', { name: 'USB' }))

      expect(value.setRelayGroup).not.toHaveBeenCalled()
    })

    it('offers the groups of the shared list, in its order, and never Unassigned', async () => {
      await openRelays({ relay_03: PUMP }, { relayGroupList: ['USB', 'Awning', 'Unassigned'] })

      expect(
        picker()
          .getAllByRole('radio')
          .map((radio) => radio.textContent),
      ).toEqual(['None', 'USB', 'Awning'])
    })

    it('reads a group that has left the list as none, and None sends nothing', async () => {
      const { user, value } = await openRelays(
        { relay_03: PUMP },
        { relayGroups: { relay_03: 'Gone' } },
      )

      expect(picker().getByRole('radio', { name: 'None' })).toBeChecked()

      await user.click(picker().getByRole('radio', { name: 'None' }))

      expect(value.setRelayGroup).not.toHaveBeenCalled()
    })
  })

  describe('byte limit', () => {
    it('shows the limit and how much of it is used, so nobody types a name the board drops', async () => {
      const { user } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      expect(screen.getByText('10 / 63 bytes')).toBeInTheDocument()

      await user.clear(field)
      await user.type(field, 'Pump')

      expect(screen.getByText('4 / 63 bytes')).toBeInTheDocument()
    })

    it('counts bytes, not characters: a non-ASCII name is shorter in characters', async () => {
      const { user } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.clear(field)
      await user.type(field, 'Café')

      expect(screen.getByText('5 / 63 bytes')).toBeInTheDocument()
    })

    it('accepts a name of exactly 63 bytes', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.clear(field)
      await user.type(field, 'a'.repeat(63) + '{Enter}')

      expect(value.setRelayName).toHaveBeenCalledExactlyOnceWith('relay_03', 'a'.repeat(63))
    })

    it('refuses a name of 64 bytes rather than sending one the board silently drops', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      await user.clear(field)
      await user.type(field, 'a'.repeat(64))

      expect(screen.getByText('64 / 63 bytes')).toBeInTheDocument()
      await user.keyboard('{Enter}')
      expect(value.setRelayName).not.toHaveBeenCalled()
    })

    it('refuses a short name that is over the limit in bytes (multi-byte characters)', async () => {
      const { user, value } = await openRelays({ relay_03: PUMP })
      const field = nameField('relay_03')

      // 32 two-byte characters = 64 bytes, though only 32 characters.
      await user.clear(field)
      await user.type(field, 'é'.repeat(32) + '{Enter}')

      expect(value.setRelayName).not.toHaveBeenCalled()
    })
  })
})
