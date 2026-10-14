import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { UserEvent } from '@testing-library/user-event'
import { renderSettings } from '@/test/renderSettings'

async function openNavbar(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^General/ }))
  await user.click(screen.getByRole('button', { name: /^Display/ }))
  await user.click(screen.getByRole('button', { name: /^Navigation position/ }))
}

describe('Settings › General › Display & Appearance › Navbar', () => {
  it('is a Display row describing the current position, opening a Left / Bottom choice', async () => {
    const { user } = renderSettings({ navbarPosition: 'bottom' })
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(screen.getByRole('button', { name: /^Display/ }))
    expect(screen.getByRole('button', { name: /^Navigation position/ })).toHaveTextContent('Bottom')

    await user.click(screen.getByRole('button', { name: /^Navigation position/ }))

    expect(screen.getByRole('link', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Navbar', current: 'page' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Bottom' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Left' })).not.toBeChecked()
  })

  it('asks for the other position exactly once, and nothing on a re-tap of the current one', async () => {
    const { user, value } = renderSettings({ navbarPosition: 'left' })
    await openNavbar(user)

    await user.click(screen.getByRole('radio', { name: 'Left' }))
    expect(value.setNavbarPosition).not.toHaveBeenCalled()

    await user.click(screen.getByRole('radio', { name: 'Bottom' }))
    expect(value.setNavbarPosition).toHaveBeenCalledExactlyOnceWith('bottom')
  })

  it('offers no choice on a phone, where the bar is always at the bottom', async () => {
    const { user, value } = renderSettings({ navbarPosition: 'left' }, { width: 390 })
    await openNavbar(user)

    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByText('The navbar is always at the bottom on a phone.')).toBeInTheDocument()
    expect(value.setNavbarPosition).not.toHaveBeenCalled()
  })
})
