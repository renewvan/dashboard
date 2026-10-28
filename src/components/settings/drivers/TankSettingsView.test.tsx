import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import type { SettingsContextValue } from '../SettingsContext'
import { renderSettings } from '@/test/renderSettings'
import type { Tank } from '@/types'

function tank(overrides: Partial<Tank> = {}): Tank {
  return {
    fluid_type: 'fresh_water',
    capacity_l: 100,
    level_pct: 62,
    status: 'ok',
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

const TANKS: Record<string, Partial<Tank>> = {
  grey: tank({ fluid_type: 'grey_water', capacity_l: 80 }),
  fresh: tank(),
  // Still arriving over MQTT: not ready to configure.
  black: { fluid_type: 'black_water' },
}

async function openTanks(overrides: Partial<SettingsContextValue> = {}) {
  const rendered = renderSettings(overrides, { bus: { tanks: TANKS as never } })
  await rendered.user.click(screen.getByRole('button', { name: /^Devices/ }))
  // Tanks have no Driver here, so they sit in a fallback row; open it, then its Tanks entity row.
  await rendered.user.click(screen.getByRole('button', { name: /^Tanks/ }))
  await rendered.user.click(
    within(screen.getByRole('list', { name: 'Entities' })).getByRole('button', { name: /^Tanks/ }),
  )
  return rendered
}

describe('Settings › Devices › Tanks', () => {
  it('drills in from a Driver page, described by its tank count', async () => {
    const { user } = renderSettings({}, { bus: { tanks: TANKS as never } })
    await user.click(screen.getByRole('button', { name: /^Devices/ }))
    await user.click(screen.getByRole('button', { name: /^Tanks/ }))

    expect(
      within(screen.getByRole('list', { name: 'Entities' })).getByRole('button', {
        name: /^Tanks/,
      }),
    ).toHaveTextContent('2 tanks')
  })

  it('lists each reported tank by name, fresh water first, skipping a partial one', async () => {
    await openTanks()

    const rows = within(screen.getByRole('list', { name: 'Tanks' })).getAllByRole('button')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringMatching(/^Fresh water/),
      expect.stringMatching(/^Grey water/),
    ])
    expect(screen.queryByRole('button', { name: /^Black water/ })).not.toBeInTheDocument()
  })

  it('says so when no tank has reported yet', async () => {
    await openTanks({ tanks: {} })

    expect(screen.getByText(/No tanks found/)).toBeInTheDocument()
  })

  it('steps back to the Driver page it was opened from, not to Devices', async () => {
    const { user } = await openTanks()

    // Here the tanks sit under the fallback Driver row named Tanks.
    expect(screen.getByRole('button', { name: 'Tanks' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Tanks' }))
    expect(screen.getByRole('list', { name: 'Entities' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tanks' })).toBeInTheDocument()
  })
})

describe('Settings › Devices › Tanks › Fresh water', () => {
  async function openFresh() {
    const rendered = await openTanks()
    await rendered.user.click(screen.getByRole('button', { name: /^Fresh water/ }))
    return rendered
  }

  it('opens under Settings › Devices › Tanks › Fresh water', async () => {
    await openFresh()

    expect(screen.getByRole('button', { name: 'Tanks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Fresh water' })).toBeInTheDocument()
  })

  it('shows an Enabled switch that is on and not yet changeable', async () => {
    await openFresh()

    const enabled = screen.getByRole('switch', { name: 'Enabled' })
    expect(enabled).toBeChecked()
    expect(enabled).toBeDisabled()
  })

  it('says why the switch cannot be changed', async () => {
    await openFresh()

    expect(screen.getByText(/not configurable from the dashboard yet/i)).toBeInTheDocument()
  })

  it('walks back to the tank list from the Tanks crumb', async () => {
    const { user } = await openFresh()

    await user.click(screen.getByRole('button', { name: 'Tanks' }))

    expect(screen.getByRole('button', { name: /^Grey water/ })).toBeInTheDocument()
  })

  it('opens straight from a deep link', async () => {
    renderSettings(
      {},
      { bus: { tanks: TANKS as never }, url: '/?page=settings&view=tank&tank=grey' },
    )
    expect(screen.getByRole('heading', { name: 'Grey water' })).toBeInTheDocument()
  })
})

describe('Settings › Devices › Tanks › unknown tank', () => {
  it('shows the tank list, not an empty panel, when ?tank= names no reported tank', () => {
    renderSettings(
      {},
      { bus: { tanks: TANKS as never }, url: '/?page=settings&view=tank&tank=nope' },
    )

    expect(screen.getByRole('heading', { name: 'Tanks' })).toBeInTheDocument()
    expect(
      within(screen.getByTestId('pane-settings')).getByRole('button', { name: /^Fresh water/ }),
    ).toBeInTheDocument()
  })
})
