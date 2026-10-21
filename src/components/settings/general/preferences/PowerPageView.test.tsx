import { cleanup, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'

async function openPowerPage(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^General/ }))
  await user.click(screen.getByRole('button', { name: /^Display/ }))
  await user.click(screen.getByRole('button', { name: /^Power page/ }))
}

describe('Settings › General › Display & Appearance › Power page', () => {
  it('is reached from a Display row and sits under it in the breadcrumb', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(screen.getByRole('button', { name: /^Display/ }))

    expect(screen.getByRole('button', { name: /^Power page/ })).toHaveTextContent(
      'Tiles, orbs or the van',
    )

    await user.click(screen.getByRole('button', { name: /^Power page/ }))

    expect(screen.getByRole('button', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Power page' })).toBeInTheDocument()
  })

  it('shows the stored layout as selected and says what it draws', async () => {
    const { user } = renderSettings({ powerLayout: 'orbs' })
    await openPowerPage(user)

    expect(screen.getByRole('radio', { name: 'Orbs' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Tiles' })).not.toBeChecked()
    expect(screen.getByText(/dots travelling along the wires/)).toBeInTheDocument()
  })

  it('switches from Tiles to Orbs', async () => {
    const { user, value } = renderSettings({ powerLayout: 'tiles' })
    await openPowerPage(user)

    await user.click(screen.getByRole('radio', { name: 'Orbs' }))

    expect(value.setPowerLayout).toHaveBeenCalledExactlyOnceWith('orbs')
  })

  it.each([
    ['van-tiles', 'Van tiles', /boxed readings plugged into it/],
    ['van-orbs', 'Van orbs', /round readings plugged into it/],
  ] as const)('offers the %s layout and says what it draws', async (value, name, hint) => {
    const { user, value: settings } = renderSettings({ powerLayout: 'tiles' })
    await openPowerPage(user)

    await user.click(screen.getByRole('radio', { name }))
    expect(settings.setPowerLayout).toHaveBeenCalledExactlyOnceWith(value)

    cleanup()
    const again = renderSettings({ powerLayout: value })
    await openPowerPage(again.user)
    expect(screen.getByRole('radio', { name })).toBeChecked()
    expect(screen.getByText(hint)).toBeInTheDocument()
  })

  it('does nothing on a re-tap of the selected layout', async () => {
    const { user, value } = renderSettings({ powerLayout: 'tiles' })
    await openPowerPage(user)

    await user.click(screen.getByRole('radio', { name: 'Tiles' }))

    expect(value.setPowerLayout).not.toHaveBeenCalled()
  })
})
