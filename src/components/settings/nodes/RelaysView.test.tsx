import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import { SettingsPage } from '../SettingsPage'
import { SettingsProvider } from '../SettingsProvider'
import type { SettingsContextValue } from '../SettingsContext'
import { renderSettings } from '@/test/renderSettings'
import type { NodeInfo, Relay } from '@/types'

const relayInfo: NodeInfo = {
  node: 'esp32-relay',
  product: 'ESP32 16-channel relay board',
  source: 'ESP32 with two chained SN74HC595 shift registers',
  publishes: ['relay'],
  version: 'v0.1.0',
}

/** Opens Settings › Nodes › the relay Node › Relays, with the relays on the bus. */
async function openRelays(
  relays: Record<string, Relay>,
  overrides: Partial<SettingsContextValue> = {},
) {
  const rendered = renderSettings(overrides, {
    bus: { relays, nodes: { 'esp32-relay': { info: relayInfo, health: 'online' } } },
  })
  await rendered.user.click(screen.getByRole('button', { name: /^Nodes/ }))
  await rendered.user.click(screen.getByRole('button', { name: /^ESP32 16-channel relay board/ }))
  await rendered.user.click(
    within(screen.getByRole('list', { name: 'Entities' })).getByRole('button', {
      name: /^Relays/,
    }),
  )
  return rendered
}

const nameField = (id: string) =>
  within(screen.getByRole('group', { name: id })).getByRole('textbox', { name: 'Name' })

const PUMP: Relay = { name: 'Water pump', state: false }

describe('Settings › Nodes › Relays', () => {
  it('lists a panel per relay by id, sorted, each with its stored name', async () => {
    await openRelays({ relay_10: { name: 'Heater' }, relay_02: PUMP, relay_03: { state: true } })

    expect(
      screen
        .getAllByRole<HTMLInputElement>('textbox', { name: 'Name' })
        .map((field) => field.value),
    ).toEqual(['Water pump', '', 'Heater'])
    expect(screen.getByRole('group', { name: 'relay_02' })).toBeInTheDocument()
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
      { bus: { nodes: { 'esp32-relay': { info: relayInfo, health: 'online' } } } },
    )
    await user.click(screen.getByRole('button', { name: /^Nodes/ }))
    await user.click(screen.getByRole('button', { name: /^ESP32 16-channel relay board/ }))

    // With no relay on the bus the Node lists no Relays row to open.
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
        <SettingsProvider value={{ ...value, relays: { relay_03: { ...PUMP, name: 'Pump' } } }}>
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
