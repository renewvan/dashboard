import { cleanup, screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'

async function openDisplay(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^General/ }))
  await user.click(screen.getByRole('button', { name: /^Display/ }))
}

async function openMapPage(user: UserEvent) {
  await openDisplay(user)
  await user.click(screen.getByRole('button', { name: /^Map page/ }))
}

describe('Settings › General › Display & Appearance › Map page', () => {
  it('is reached from a Display row and sits under it in the breadcrumb', async () => {
    const { user } = renderSettings()
    await openDisplay(user)

    await user.click(screen.getByRole('button', { name: /^Map page/ }))

    expect(screen.getByRole('button', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Map page' })).toBeInTheDocument()
  })

  it.each([
    ['auto', 'Map theme: Auto'],
    ['light', 'Map theme: Light'],
    ['dark', 'Map theme: Dark'],
  ] as const)(
    'shows the current choice (%s) on its row, so it is visible without opening',
    async (mapTheme, text) => {
      const { user } = renderSettings({ mapTheme })
      await openDisplay(user)

      expect(screen.getByRole('button', { name: /^Map page/ })).toHaveTextContent(text)
    },
  )

  it('offers Auto, Light and Dark, with the current one selected', async () => {
    const { user } = renderSettings({ mapTheme: 'light' })
    await openMapPage(user)

    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label') ?? radio.textContent),
    ).toEqual(['Auto', 'Light', 'Dark'])
    expect(screen.getByRole('radio', { name: 'Light' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Auto' })).not.toBeChecked()
  })

  it.each([
    ['auto', 'Dark', 'dark', /Always a dark map/],
    ['dark', 'Auto', 'auto', /follows the app/],
    ['auto', 'Light', 'light', /Always a light map/],
  ] as const)('switches from %s to %s and says what that does', async (from, toName, to, hint) => {
    const { user, value } = renderSettings({ mapTheme: from })
    await openMapPage(user)

    await user.click(screen.getByRole('radio', { name: toName }))
    expect(value.setMapTheme).toHaveBeenCalledExactlyOnceWith(to)

    cleanup()
    const again = renderSettings({ mapTheme: to })
    await openMapPage(again.user)
    expect(screen.getByRole('radio', { name: toName })).toBeChecked()
    expect(screen.getByText(hint)).toBeInTheDocument()
  })

  it('does nothing on a re-tap of the selected choice', async () => {
    const { user, value } = renderSettings({ mapTheme: 'auto' })
    await openMapPage(user)

    await user.click(screen.getByRole('radio', { name: 'Auto' }))

    expect(value.setMapTheme).not.toHaveBeenCalled()
  })
})
