import { screen } from '@testing-library/react'
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
      'Tiles or flow layout',
    )

    await user.click(screen.getByRole('button', { name: /^Power page/ }))

    expect(screen.getByRole('link', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Power page', current: 'page' })).toBeInTheDocument()
  })

  it('shows the stored layout as selected and says what it draws', async () => {
    const { user } = renderSettings({ powerLayout: 'flow' })
    await openPowerPage(user)

    expect(screen.getByRole('radio', { name: 'Flow' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Tiles' })).not.toBeChecked()
    expect(screen.getByText(/dots travelling along the wires/)).toBeInTheDocument()
  })

  it('switches from Tiles to Flow', async () => {
    const { user, value } = renderSettings({ powerLayout: 'tiles' })
    await openPowerPage(user)

    await user.click(screen.getByRole('radio', { name: 'Flow' }))

    expect(value.setPowerLayout).toHaveBeenCalledExactlyOnceWith('flow')
  })

  it('does nothing on a re-tap of the selected layout', async () => {
    const { user, value } = renderSettings({ powerLayout: 'tiles' })
    await openPowerPage(user)

    await user.click(screen.getByRole('radio', { name: 'Tiles' }))

    expect(value.setPowerLayout).not.toHaveBeenCalled()
  })
})
