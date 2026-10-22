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
      'Van tiles or van orbs',
    )

    await user.click(screen.getByRole('button', { name: /^Power page/ }))

    expect(screen.getByRole('button', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Power page' })).toBeInTheDocument()
  })

  it('offers only the van layouts', async () => {
    const { user } = renderSettings({ powerLayout: 'van-tiles' })
    await openPowerPage(user)

    expect(
      screen
        .getAllByRole('radio')
        .map((radio) => radio.getAttribute('aria-label') ?? radio.textContent),
    ).toEqual(['Van tiles', 'Van orbs'])
  })

  it('still opens with a stored Tiles or Orbs layout, with nothing selected', async () => {
    const { user } = renderSettings({ powerLayout: 'orbs' })
    await openPowerPage(user)

    expect(screen.getByRole('radio', { name: 'Van tiles' })).not.toBeChecked()
    expect(screen.getByRole('radio', { name: 'Van orbs' })).not.toBeChecked()
    expect(screen.getByText(/dots travelling along the wires/)).toBeInTheDocument()
  })

  it.each([
    ['van-tiles', 'Van tiles', 'van-orbs', 'Van orbs', /round readings plugged into it/],
    ['van-orbs', 'Van orbs', 'van-tiles', 'Van tiles', /boxed readings plugged into it/],
  ] as const)(
    'switches from %s to the other van layout and says what it draws',
    async (from, _fromName, to, toName, hint) => {
      const { user, value } = renderSettings({ powerLayout: from })
      await openPowerPage(user)

      await user.click(screen.getByRole('radio', { name: toName }))
      expect(value.setPowerLayout).toHaveBeenCalledExactlyOnceWith(to)

      cleanup()
      const again = renderSettings({ powerLayout: to })
      await openPowerPage(again.user)
      expect(screen.getByRole('radio', { name: toName })).toBeChecked()
      expect(screen.getByText(hint)).toBeInTheDocument()
    },
  )

  it('does nothing on a re-tap of the selected layout', async () => {
    const { user, value } = renderSettings({ powerLayout: 'van-tiles' })
    await openPowerPage(user)

    await user.click(screen.getByRole('radio', { name: 'Van tiles' }))

    expect(value.setPowerLayout).not.toHaveBeenCalled()
  })
})
