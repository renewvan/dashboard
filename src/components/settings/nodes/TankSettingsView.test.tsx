import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { NodeSummary } from '@/lib/nodes'
import { renderSettings } from '@/test/renderSettings'
import type { Tank } from '@/types'

const tanksNode: NodeSummary = { domain: 'tanks', label: 'Tanks', count: 2 }

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

async function openTanks(overrides: Parameters<typeof renderSettings>[0] = {}) {
  const rendered = renderSettings({ nodes: [tanksNode], tanks: TANKS, ...overrides })
  await rendered.user.click(screen.getByRole('button', { name: /^Nodes/ }))
  await rendered.user.click(screen.getByRole('button', { name: /^Tanks/ }))
  return rendered
}

describe('Settings › Nodes › Tanks', () => {
  it('drills in from Nodes, described by its tank count', async () => {
    const { user } = renderSettings({ nodes: [tanksNode], tanks: TANKS })
    await user.click(screen.getByRole('button', { name: /^Nodes/ }))

    expect(screen.getByRole('button', { name: /^Tanks/ })).toHaveTextContent('2 tanks')
  })

  it('lists each reported tank by name, fresh water first, skipping a partial one', async () => {
    await openTanks()

    const rows = screen.getAllByRole('button').filter((row) => /water/.test(row.textContent ?? ''))
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

  it('shows the Tanks crumb under Nodes', async () => {
    await openTanks()

    expect(screen.getByRole('link', { name: 'Nodes' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Tanks', current: 'page' })).toBeInTheDocument()
  })
})

describe('Settings › Nodes › Tanks › Fresh water', () => {
  async function openFresh() {
    const rendered = await openTanks()
    await rendered.user.click(screen.getByRole('button', { name: /^Fresh water/ }))
    return rendered
  }

  it('opens under Settings › Nodes › Tanks › Fresh water', async () => {
    await openFresh()

    expect(screen.getByRole('link', { name: 'Tanks' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Fresh water', current: 'page' })).toBeInTheDocument()
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

    await user.click(screen.getByRole('link', { name: 'Tanks' }))

    expect(screen.getByRole('button', { name: /^Grey water/ })).toBeInTheDocument()
  })

  it('opens straight from a deep link', async () => {
    renderSettings(
      { nodes: [tanksNode], tanks: TANKS },
      { url: '/?page=settings&view=tank&tank=grey' },
    )
    expect(screen.getByRole('link', { name: 'Grey water', current: 'page' })).toBeInTheDocument()
  })
})

describe('Settings › Nodes › Tanks › unknown tank', () => {
  it('shows the tank list, not an empty panel, when ?tank= names no reported tank', () => {
    renderSettings(
      { nodes: [tanksNode], tanks: TANKS },
      { url: '/?page=settings&view=tank&tank=nope' },
    )

    expect(screen.getByRole('link', { name: 'Tanks', current: 'page' })).toBeInTheDocument()
    expect(
      within(screen.getByTestId('pane-settings')).getByRole('button', { name: /^Fresh water/ }),
    ).toBeInTheDocument()
  })
})
