import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import type { SettingsContextValue } from '../SettingsContext'
import { SettingsProvider } from '../SettingsProvider'
import { settingsSlices } from '@/test/settingsSlices'
import { SettingsPage } from '../SettingsPage'
import { renderSettings } from '@/test/renderSettings'
import type { TemperatureSensor } from '@/types'

const outdoor: TemperatureSensor = {
  name: 'Outdoor',
  unit: 'C',
  source: 'w1',
  serial: '28-000000259026',
  temperature_c: 31.4,
  status: 'ok',
}

const indoor: TemperatureSensor = {
  name: 'Indoor',
  unit: 'F',
  source: 'cpu',
  temperature_c: 20,
  status: 'ok',
}

/**
 * Opens Settings › Devices › Temperature. With no Driver publishing info the sensors sit in a fallback
 * row, so the path is the Devices list, that row, then its Temperature entity row. The row exists
 * while the bus holds a sensor; `overrides.temperatures` empties what the view reads, not the row.
 */
async function openTemperature(
  temperatures: Record<string, Partial<TemperatureSensor>>,
  overrides: Partial<SettingsContextValue> = {},
  /** Which sensor's card to open Details on, in the order the list shows them. */
  card = 0,
  /** The shared entity icons on the bus. */
  entityIcons: Record<string, string> = {},
) {
  const onBus = Object.keys(temperatures).length > 0 ? temperatures : { probe: {} }
  const rendered = renderSettings(overrides, {
    bus: { temperatures: onBus as never },
    entityIcons,
  })
  await rendered.user.click(screen.getByRole('button', { name: /^Devices/ }))
  await rendered.user.click(screen.getByRole('button', { name: /^Temperature/ }))
  await rendered.user.click(
    within(screen.getByRole('list', { name: 'Entities' })).getByRole('button', {
      name: /^Temperature/,
    }),
  )
  if (Object.keys(temperatures).length > 0) {
    await rendered.user.click(
      within(screen.getByRole('list', { name: 'Temperature' })).getAllByRole('button')[card],
    )
  }
  return rendered
}

const nameField = (panel: string) =>
  within(screen.getByRole('group', { name: panel })).getByRole('textbox', { name: 'Name' })

describe('Settings › Devices › Temperature', () => {
  it('is a drill-in on a Driver page, described by its sensor count', async () => {
    const { user } = renderSettings(
      {},
      { bus: { tanks: { fresh: {} as never }, temperatures: { outdoor, indoor } } },
    )
    await user.click(screen.getByRole('button', { name: /^Devices/ }))
    await user.click(screen.getByRole('button', { name: /^Temperature/ }))

    const entities = within(screen.getByRole('list', { name: 'Entities' }))
    expect(entities.getByRole('button', { name: /^Temperature/ })).toHaveTextContent('2 sensors')

    await user.click(entities.getByRole('button', { name: /^Temperature/ }))

    // Back names the Driver page it came from (the fallback row, named Temperature).
    expect(screen.getByRole('button', { name: 'Temperature' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Temperature' })).toBeInTheDocument()
  })

  it('lists a card per sensor: outdoor, indoor, then by id, each with its reading', async () => {
    const { user } = await openTemperature({
      zeta: { ...outdoor, serial: '28-zzz', name: 'Zeta' },
      alpha: { ...outdoor, serial: '28-aaa', name: 'Alpha' },
      indoor,
      outdoor,
    })
    // `openTemperature` opened the first card; its Details is the outdoor sensor's panel.
    const outdoorPanel = screen.getByRole('group', { name: 'Outdoor' })
    expect(within(outdoorPanel).getByText('31°C')).toBeInTheDocument()
    expect(within(outdoorPanel).getByRole('textbox', { name: 'Name' })).toHaveValue('Outdoor')

    await user.click(screen.getByRole('button', { name: 'Temperature' }))

    const list = within(screen.getByRole('list', { name: 'Temperature' }))
    expect(list.getAllByRole('button').map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Outdoor31°C/),
      expect.stringMatching(/^Indoor68°F/),
      expect.stringMatching(/^Alpha/),
      expect.stringMatching(/^Zeta/),
    ])
  })

  it('says so when no sensor has published', async () => {
    await openTemperature({}, { temperatures: {} })

    expect(
      screen.getByText('No temperature sensors found. Waiting for driver-temperature to publish.'),
    ).toBeInTheDocument()
  })

  describe('rename', () => {
    it('commits once, on Enter, trimmed, and nothing is sent while typing', async () => {
      const { user, value } = await openTemperature({ outdoor })
      const field = nameField('Outdoor')

      await user.clear(field)
      await user.type(field, '  Galley roof ')

      expect(value.setTemperatureName).not.toHaveBeenCalled()

      await user.keyboard('{Enter}')

      expect(value.setTemperatureName).toHaveBeenCalledExactlyOnceWith('outdoor', 'Galley roof')
    })

    it('commits on leaving the field, once', async () => {
      const { user, value } = await openTemperature({ outdoor })
      const field = nameField('Outdoor')

      await user.clear(field)
      await user.type(field, 'Roof')
      await user.tab()

      expect(value.setTemperatureName).toHaveBeenCalledExactlyOnceWith('outdoor', 'Roof')
    })

    it('shows the held value, not the typed one, until the hub echoes the change', async () => {
      const { user, rerender, value } = await openTemperature({ outdoor })
      const field = nameField('Outdoor')

      await user.clear(field)
      await user.type(field, 'Roof{Enter}')

      expect(value.setTemperatureName).toHaveBeenCalledExactlyOnceWith('outdoor', 'Roof')
      expect(field).toHaveValue('Outdoor')

      rerender(
        <SettingsProvider
          {...settingsSlices({
            ...value,
            temperatures: { outdoor: { ...outdoor, name: 'Roof' } },
          })}
        >
          <SettingsPage />
        </SettingsProvider>,
      )
      expect(nameField('Outdoor')).toHaveValue('Roof')
    })

    it.each([
      ['an empty name', '   {Enter}'],
      ['an unchanged name', 'Outdoor{Enter}'],
      ['a cancelled edit', 'Typo{Escape}'],
    ])('does not publish %s and reverts the field', async (_label, typed) => {
      const { user, value } = await openTemperature({ outdoor })
      const field = nameField('Outdoor')

      await user.clear(field)
      await user.type(field, typed)

      expect(value.setTemperatureName).not.toHaveBeenCalled()
      expect(field).toHaveValue('Outdoor')
      expect(field).not.toHaveFocus()
    })

    it('shows another client’s rename while not editing', async () => {
      const { rerender, value } = await openTemperature({ outdoor })

      rerender(
        <SettingsProvider
          {...settingsSlices({
            ...value,
            temperatures: { outdoor: { ...outdoor, name: 'Awning' } },
          })}
        >
          <SettingsPage />
        </SettingsProvider>,
      )

      expect(nameField('Outdoor')).toHaveValue('Awning')
    })
  })

  describe('unit', () => {
    it('publishes only on an actual change, for that sensor only', async () => {
      const { user, value } = await openTemperature({ outdoor, indoor })
      const panel = screen.getByRole('group', { name: 'Outdoor' })

      await user.click(within(panel).getByRole('radio', { name: '°C' }))
      expect(value.setTemperatureUnit).not.toHaveBeenCalled()

      await user.click(within(panel).getByRole('radio', { name: '°F' }))
      expect(value.setTemperatureUnit).toHaveBeenCalledExactlyOnceWith('outdoor', 'F')
    })
  })

  describe('icon', () => {
    it("shows the probe's icon as picked and publishes only a change, for that sensor only", async () => {
      const { user, value } = await openTemperature({ outdoor }, {}, 0, {
        'temperature/outdoor': 'Sun',
      })
      const group = within(screen.getByRole('group', { name: 'Outdoor' })).getByRole('radiogroup', {
        name: 'Icon',
      })

      expect(within(group).getByRole('radio', { name: 'Sun' })).toBeChecked()

      await user.click(within(group).getByRole('radio', { name: 'Sun' }))
      expect(value.setEntityIcon).not.toHaveBeenCalled()

      await user.click(within(group).getByRole('radio', { name: 'Refrigerator' }))
      expect(value.setEntityIcon).toHaveBeenCalledExactlyOnceWith(
        'temperature',
        'outdoor',
        'Refrigerator',
      )
    })
  })

  describe('before the sensor has reported its identity', () => {
    it('disables the name field and both unit buttons, with an empty name', async () => {
      await openTemperature({ outdoor: { status: 'ok' } })

      const panel = screen.getByRole('group')
      expect(within(panel).getByRole('textbox', { name: 'Name' })).toBeDisabled()
      expect(within(panel).getByRole('textbox', { name: 'Name' })).toHaveValue('')
      expect(within(panel).getByRole('radio', { name: '°C' })).toBeDisabled()
      expect(within(panel).getByRole('radio', { name: '°F' })).toBeDisabled()
    })
  })

  describe('a sensor that is not ok', () => {
    it('shows a dashed reading and no stale number', async () => {
      await openTemperature({
        outdoor: { ...outdoor, status: 'disconnected', temperature_c: 31.4 },
      })

      const panel = screen.getByRole('group', { name: 'Outdoor' })
      expect(panel).toHaveTextContent('--°C')
      expect(panel).not.toHaveTextContent('31')
    })
  })
})
