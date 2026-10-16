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

    expect(screen.getByRole('link', { name: 'Start page', current: 'page' })).toBeInTheDocument()
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
