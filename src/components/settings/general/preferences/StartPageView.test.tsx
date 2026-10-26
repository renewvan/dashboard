import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'
import type { UserEvent } from '@testing-library/user-event'
import { DEFAULT_START_POWER_SOURCES, type StartPowerSources } from '@/hooks/useStartPowerSources'
import { renderSettings } from '@/test/renderSettings'

async function openStartPage(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^General/ }))
  await user.click(screen.getByRole('button', { name: /^Display/ }))
  await user.click(screen.getByRole('button', { name: /^Start page/ }))
}

describe('Settings › General › Display & Appearance › Start page', () => {
  it('is a Display row that opens a card per half-moon reading, the charger one without a source', async () => {
    const { user } = renderSettings()
    await openStartPage(user)

    expect(screen.getByRole('heading', { name: 'Start page' })).toBeInTheDocument()
    for (const label of ['Left, top', 'Right']) {
      expect(screen.getByRole('radiogroup', { name: `${label} source` })).toBeInTheDocument()
    }
    expect(
      screen.queryByRole('radiogroup', { name: 'Left, bottom source' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Left, top full band' })).toHaveTextContent('400 W')
    expect(screen.getByRole('status', { name: 'Left, bottom full band' })).toHaveTextContent(
      '1000 W',
    )
    expect(screen.getByRole('status', { name: 'Right full band' })).toHaveTextContent('1000 W')
  })

  it('chooses the Start view, Cockpit selected by default, and sends nothing on a re-tap', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    const group = screen.getByRole('radiogroup', { name: 'Start view' })
    expect(within(group).getByRole('radio', { name: 'Cockpit' })).toBeChecked()

    await user.click(within(group).getByRole('radio', { name: 'Cockpit' }))
    expect(value.setStartView).not.toHaveBeenCalled()

    await user.click(within(group).getByRole('radio', { name: 'Masonry' }))
    expect(value.setStartView).toHaveBeenCalledExactlyOnceWith('masonry')
  })

  it('shows the Cockpit settings, not the tile sizes, while the view is Cockpit', async () => {
    const { user } = renderSettings()
    await openStartPage(user)

    expect(screen.getByRole('heading', { name: 'Centre' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Level Rings' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Tile sizes' })).not.toBeInTheDocument()
  })

  describe('Masonry view', () => {
    it('drops the Cockpit settings for the order and a size card per tile, Energy being Power and Battery', async () => {
      const { user } = renderSettings({ startView: 'masonry', startLayout: ['map', 'energy'] })
      await openStartPage(user)

      for (const name of ['Centre', 'Power Readings', 'Level Rings']) {
        expect(screen.queryByRole('heading', { name })).not.toBeInTheDocument()
      }
      expect(screen.queryByRole('radiogroup', { name: 'Right source' })).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Widgets/ })).toBeInTheDocument()
      const width = screen.getByRole('radiogroup', { name: 'Battery width' })
      expect(within(width).getByRole('radio', { name: '1' })).toBeChecked()
      const height = screen.getByRole('radiogroup', { name: 'Battery height' })
      expect(within(height).getByRole('radio', { name: '2' })).toBeChecked()
      expect(screen.getByRole('radiogroup', { name: 'Power width' })).toBeInTheDocument()
      expect(screen.queryByRole('radiogroup', { name: 'Energy width' })).not.toBeInTheDocument()
      expect(screen.queryByRole('radiogroup', { name: 'Tilt width' })).not.toBeInTheDocument()
    })

    it('stores a changed size as an override, keeping the other overrides', async () => {
      const { user, value } = renderSettings({
        startView: 'masonry',
        startLayout: ['map', 'energy'],
        startTiles: { map: { cols: 4, rows: 2 } },
      })
      await openStartPage(user)

      const height = screen.getByRole('radiogroup', { name: 'Battery height' })
      await user.click(within(height).getByRole('radio', { name: '1' }))

      expect(value.setStartTiles).toHaveBeenCalledExactlyOnceWith({
        map: { cols: 4, rows: 2 },
        battery: { cols: 1, rows: 1 },
      })
    })

    it('drops the override when a size is put back to the shipped one', async () => {
      const { user, value } = renderSettings({
        startView: 'masonry',
        startLayout: ['energy'],
        startTiles: { battery: { cols: 1, rows: 1 } },
      })
      await openStartPage(user)

      const height = screen.getByRole('radiogroup', { name: 'Battery height' })
      await user.click(within(height).getByRole('radio', { name: '2' }))

      expect(value.setStartTiles).toHaveBeenCalledExactlyOnceWith({})
    })

    it('resets every size, the button off while none is changed', async () => {
      const first = renderSettings({ startView: 'masonry' })
      await openStartPage(first.user)
      expect(screen.getByRole('button', { name: 'Reset tile sizes' })).toBeDisabled()
    })

    it('resets every changed size', async () => {
      const { user, value } = renderSettings({
        startView: 'masonry',
        startTiles: { tilt: { cols: 2, rows: 1 } },
      })
      await openStartPage(user)

      await user.click(screen.getByRole('button', { name: 'Reset tile sizes' }))
      expect(value.setStartTiles).toHaveBeenCalledExactlyOnceWith({})
    })
  })

  it('changes only the touched slot, keeping the others', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    const group = screen.getByRole('radiogroup', { name: 'Right source' })
    await user.click(within(group).getByRole('radio', { name: 'Solar' }))

    const expected: StartPowerSources = {
      ...DEFAULT_START_POWER_SOURCES,
      right: { source: 'solar', fullScaleW: 1000 },
    }
    expect(value.setStartPowerSources).toHaveBeenCalledExactlyOnceWith(expected)
  })

  it('does nothing on a re-tap of the selected source', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    const group = screen.getByRole('radiogroup', { name: 'Left, top source' })
    await user.click(within(group).getByRole('radio', { name: 'Solar' }))

    expect(value.setStartPowerSources).not.toHaveBeenCalled()
  })

  it('steps a scale by a size that suits its range, 50 W below 500 W', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    await user.click(screen.getByRole('button', { name: 'Increase Left, top full band' }))

    expect(value.setStartPowerSources).toHaveBeenCalledExactlyOnceWith({
      ...DEFAULT_START_POWER_SOURCES,
      leftTop: { source: 'solar', fullScaleW: 450 },
    })
  })

  it('offers the tilt, the van or the battery readout for the middle, defaulting to the tilt', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    const group = screen.getByRole('radiogroup', { name: 'Shows' })
    expect(
      within(group)
        .getAllByRole('radio')
        .map((radio) => radio.textContent),
    ).toEqual(['Tilt', 'Van', 'Battery readout'])
    expect(within(group).getByRole('radio', { name: 'Tilt' })).toBeChecked()

    await user.click(within(group).getByRole('radio', { name: 'Battery readout' }))

    expect(value.setStartPowerSources).toHaveBeenCalledExactlyOnceWith({
      ...DEFAULT_START_POWER_SOURCES,
      centre: 'battery',
    })
  })

  it('offers the battery and every fluid for a ring, defaulting to battery, fresh, grey', async () => {
    const { user } = renderSettings()
    await openStartPage(user)

    const outer = screen.getByRole('radiogroup', { name: 'Outer ring source' })
    expect(
      within(outer)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['Battery', 'Fresh water', 'Grey water', 'Black water', 'Fuel', 'LPG'])
    expect(within(outer).getByRole('radio', { name: 'Battery' })).toBeChecked()
    expect(
      within(screen.getByRole('radiogroup', { name: 'Middle ring source' })).getByRole('radio', {
        name: 'Fresh water',
      }),
    ).toBeChecked()
    expect(
      within(screen.getByRole('radiogroup', { name: 'Inner ring source' })).getByRole('radio', {
        name: 'Grey water',
      }),
    ).toBeChecked()
  })

  it('changes only the touched ring, keeping the other two and every power reading', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    const middle = screen.getByRole('radiogroup', { name: 'Middle ring source' })
    await user.click(within(middle).getByRole('radio', { name: 'Fuel' }))

    expect(value.setStartPowerSources).toHaveBeenCalledExactlyOnceWith({
      ...DEFAULT_START_POWER_SOURCES,
      rings: ['battery', 'fuel', 'grey_water'],
    })
  })

  it('reads tank rings in % by default and offers Liters (\u2113) as the other choice', async () => {
    const { user } = renderSettings()
    await openStartPage(user)

    const unit = screen.getByRole('radiogroup', { name: 'Unit' })
    expect(
      within(unit)
        .getAllByRole('radio')
        .map((r) => r.textContent),
    ).toEqual(['%', 'Liters (\u2113)'])
    expect(within(unit).getByRole('radio', { name: '%' })).toBeChecked()
  })

  it('changes only the unit, keeping the rings and every power reading', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Unit' })).getByRole('radio', {
        name: 'Liters (\u2113)',
      }),
    )

    expect(value.setStartPowerSources).toHaveBeenCalledExactlyOnceWith({
      ...DEFAULT_START_POWER_SOURCES,
      ringUnit: 'litres',
    })
  })

  it('does nothing on a re-tap of the selected unit', async () => {
    const { user, value } = renderSettings()
    await openStartPage(user)

    await user.click(
      within(screen.getByRole('radiogroup', { name: 'Unit' })).getByRole('radio', {
        name: '%',
      }),
    )

    expect(value.setStartPowerSources).not.toHaveBeenCalled()
  })

  it('stops stepping at the ends of the range', async () => {
    const { user } = renderSettings({
      startPowerSources: {
        ...DEFAULT_START_POWER_SOURCES,
        leftTop: { source: 'solar', fullScaleW: 50 },
        right: { source: 'battery-out', fullScaleW: 20_000 },
      },
    })
    await openStartPage(user)

    expect(screen.getByRole('button', { name: 'Decrease Left, top full band' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase Right full band' })).toBeDisabled()
  })
})
