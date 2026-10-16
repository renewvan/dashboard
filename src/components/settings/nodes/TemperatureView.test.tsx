import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import type { NodeSummary } from '@/lib/nodes'
import { SettingsProvider } from '../SettingsProvider'
import { SettingsPage } from '../SettingsPage'
import { renderSettings } from '@/test/renderSettings'
import type { TemperatureSensor } from '@/types'

const temperatureNode: NodeSummary = { domain: 'temperatures', label: 'Temperature', count: 1 }

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

async function openTemperature(
  temperatures: Record<string, Partial<TemperatureSensor>>,
  overrides: Parameters<typeof renderSettings>[0] = {},
) {
  const rendered = renderSettings({ nodes: [temperatureNode], temperatures, ...overrides })
  await rendered.user.click(screen.getByRole('button', { name: /^Nodes/ }))
  await rendered.user.click(screen.getByRole('button', { name: /^Temperature/ }))
  return rendered
}

const nameField = (panel: string) =>
  within(screen.getByRole('group', { name: panel })).getByRole('textbox', { name: 'Name' })

describe('Settings › Nodes › Temperature', () => {
  it('is a drill-in on Nodes next to Tanks, described by its sensor count', async () => {
    const { user } = renderSettings({
      nodes: [{ domain: 'tanks', label: 'Tanks', count: 2 }, temperatureNode],
      temperatures: { outdoor, indoor },
    })
    await user.click(screen.getByRole('button', { name: /^Nodes/ }))

    expect(screen.getByRole('button', { name: /^Temperature/ })).toHaveTextContent('2 sensors')
    expect(
      within(screen.getByRole('list', { name: 'Published nodes' })).getAllByRole('button'),
    ).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: /^Temperature/ }))

    expect(screen.getByRole('link', { name: 'Nodes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Temperature', current: 'page' })).toBeInTheDocument()
  })

  it('lists a panel per sensor: outdoor, indoor, then by id, each with source and reading', async () => {
    await openTemperature({
      zeta: { ...outdoor, serial: '28-zzz', name: 'Zeta' },
      alpha: { ...outdoor, serial: '28-aaa', name: 'Alpha' },
      indoor,
      outdoor,
    })

    expect(
      screen
        .getAllByRole<HTMLInputElement>('textbox', { name: 'Name' })
        .map((field) => field.value),
    ).toEqual(['Outdoor', 'Indoor', 'Alpha', 'Zeta'])
    const indoorPanel = screen.getByRole('group', { name: 'Pi CPU' })
    expect(within(indoorPanel).getByText('68°F')).toBeInTheDocument()
    const outdoorPanel = screen.getByRole('group', { name: '28-000000259026' })
    expect(within(outdoorPanel).getByText('31°C')).toBeInTheDocument()
    expect(within(outdoorPanel).getByRole('textbox', { name: 'Name' })).toHaveValue('Outdoor')
  })

  it('says so when no sensor has published', async () => {
    await openTemperature({}, { nodes: [temperatureNode] })

    expect(
      screen.getByText('No temperature sensors found. Waiting for node-temperature to publish.'),
    ).toBeInTheDocument()
  })

  describe('rename', () => {
    it('commits once, on Enter, trimmed, and nothing is sent while typing', async () => {
      const { user, value } = await openTemperature({ outdoor })
      const field = nameField('28-000000259026')

      await user.clear(field)
      await user.type(field, '  Galley roof ')

      expect(value.setTemperatureName).not.toHaveBeenCalled()

      await user.keyboard('{Enter}')

      expect(value.setTemperatureName).toHaveBeenCalledExactlyOnceWith('outdoor', 'Galley roof')
    })

    it('commits on leaving the field, once', async () => {
      const { user, value } = await openTemperature({ outdoor })
      const field = nameField('28-000000259026')

      await user.clear(field)
      await user.type(field, 'Roof')
      await user.tab()

      expect(value.setTemperatureName).toHaveBeenCalledExactlyOnceWith('outdoor', 'Roof')
    })

    it('shows the held value, not the typed one, until the hub echoes the change', async () => {
      const { user, rerender, value } = await openTemperature({ outdoor })
      const field = nameField('28-000000259026')

      await user.clear(field)
      await user.type(field, 'Roof{Enter}')

      expect(value.setTemperatureName).toHaveBeenCalledExactlyOnceWith('outdoor', 'Roof')
      expect(field).toHaveValue('Outdoor')

      rerender(
        <SettingsProvider
          value={{ ...value, temperatures: { outdoor: { ...outdoor, name: 'Roof' } } }}
        >
          <SettingsPage />
        </SettingsProvider>,
      )
      expect(nameField('28-000000259026')).toHaveValue('Roof')
    })

    it.each([
      ['an empty name', '   {Enter}'],
      ['an unchanged name', 'Outdoor{Enter}'],
      ['a cancelled edit', 'Typo{Escape}'],
    ])('does not publish %s and reverts the field', async (_label, typed) => {
      const { user, value } = await openTemperature({ outdoor })
      const field = nameField('28-000000259026')

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
          value={{ ...value, temperatures: { outdoor: { ...outdoor, name: 'Awning' } } }}
        >
          <SettingsPage />
        </SettingsProvider>,
      )

      expect(nameField('28-000000259026')).toHaveValue('Awning')
    })
  })

  describe('unit', () => {
    it('publishes only on an actual change, for that sensor only', async () => {
      const { user, value } = await openTemperature({ outdoor, indoor })
      const panel = screen.getByRole('group', { name: '28-000000259026' })

      await user.click(within(panel).getByRole('radio', { name: '°C' }))
      expect(value.setTemperatureUnit).not.toHaveBeenCalled()

      await user.click(within(panel).getByRole('radio', { name: '°F' }))
      expect(value.setTemperatureUnit).toHaveBeenCalledExactlyOnceWith('outdoor', 'F')
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

      const panel = screen.getByRole('group', { name: '28-000000259026' })
      expect(panel).toHaveTextContent('--°C')
      expect(panel).not.toHaveTextContent('31')
    })
  })
})
