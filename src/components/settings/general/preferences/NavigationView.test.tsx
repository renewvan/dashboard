import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import type { UserEvent } from '@testing-library/user-event'
import { renderSettings } from '@/test/renderSettings'

const STORAGE_KEY = 'renewvan-dashboard-settings-nav-style'

let consoleWarn: MockInstance<typeof console.warn>
let consoleError: MockInstance<typeof console.error>

beforeEach(() => {
  window.localStorage.clear()
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  // Unlabelled dialogs and the like only surface as warnings; none may appear.
  expect(consoleWarn).not.toHaveBeenCalled()
  expect(consoleError).not.toHaveBeenCalled()
  vi.restoreAllMocks()
})

/** Walks the page to the Navigation view with subpages. */
async function openNavigation(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^General/ }))
  await user.click(screen.getByRole('button', { name: /^Display/ }))
  await user.click(screen.getByRole('button', { name: /^Navigation style/ }))
}

/** The drawer that is open (the previous one may still be sliding out). */
async function openDialog(name: string) {
  return screen.findByRole('dialog', { name })
}

async function expectNoDialog() {
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

describe('Settings › General › Display & Appearance › Navigation', () => {
  it('is linked from the end of Display, described as Subpages by default', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(screen.getByRole('button', { name: /^Display/ }))

    const rows = screen.getAllByRole('button').map((button) => button.textContent)
    expect(rows.at(-1)).toBe('Navigation styleSubpages')

    await user.click(screen.getByRole('button', { name: /^Navigation style/ }))

    expect(screen.getByRole('link', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Navigation', current: 'page' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Subpages' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Drawers' })).not.toBeChecked()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the default (subpages) when the stored value is not a known style', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'carousel')
    const rendered = renderSettings()
    await openNavigation(rendered.user)

    expect(screen.getByRole('radio', { name: 'Subpages' })).toBeChecked()
  })

  it('persists the choice across remounts', async () => {
    const first = renderSettings()
    await openNavigation(first.user)
    await first.user.click(screen.getByRole('radio', { name: 'Drawers' }))

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('drawer')
    first.unmount()

    const second = renderSettings()
    await second.user.click(screen.getByRole('button', { name: /^General/ }))

    expect(await openDialog('General')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('goes back to subpages from a drawer', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'drawer')
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )
    await user.click(
      await within(await openDialog('Display & Appearance')).findByRole('button', {
        name: /^Navigation style/,
      }),
    )

    const navigation = await openDialog('Navigation')
    expect(within(navigation).getByRole('radio', { name: 'Drawers' })).toBeChecked()
    await user.click(within(navigation).getByRole('radio', { name: 'Subpages' }))

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('subpage')
    await expectNoDialog()
    expect(screen.getByRole('link', { name: 'Navigation', current: 'page' })).toBeInTheDocument()
  })
})

describe('drawer navigation', () => {
  beforeEach(() => {
    window.localStorage.setItem(STORAGE_KEY, 'drawer')
  })

  it('opens each view in a dialog over the top list, and the list stays on the page', async () => {
    const { user } = renderSettings()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^Connectivity/ }))

    const dialog = await openDialog('Connectivity')
    expect(
      within(dialog)
        .getAllByRole('button')
        .map((button) => button.textContent)
        .filter((text) => /^(Cellular|Hub|Tailscale)/.test(text ?? '')),
    ).toEqual(['CellularLTE · O2', 'HubConnected', 'Tailscale100.64.0.1'])
    // The page behind the drawer is still the top list, not a breadcrumbed subpage.
    expect(screen.getByRole('heading', { name: 'Settings', hidden: true })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('renders the pages added by other tickets in their own drawers, replacing the parent in place', async () => {
    const { user } = renderSettings({
      nodes: [{ domain: 'temperatures', label: 'Temperature', count: 1 }],
      temperatures: {
        outdoor: { name: 'Outdoor', unit: 'C', source: 'w1', temperature_c: 31.4, status: 'ok' },
      },
    })

    await user.click(screen.getByRole('button', { name: /^Nodes/ }))
    await user.click(
      await within(await openDialog('Nodes')).findByRole('button', { name: /^Temperature/ }),
    )
    const temperature = await openDialog('Temperature')
    expect(within(temperature).getByRole('textbox', { name: 'Name' })).toHaveValue('Outdoor')
    await user.click(within(temperature).getByRole('button', { name: 'Back' }))
    expect(await openDialog('Nodes')).toBeInTheDocument()
    await user.click(within(await openDialog('Nodes')).getByRole('button', { name: 'Close' }))
    await expectNoDialog()

    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Alerts/ }),
    )
    const alerts = await openDialog('Alerts')
    expect(
      within(alerts).getByRole('switch', { name: 'Show alert notifications' }),
    ).toBeInTheDocument()
    await user.click(within(alerts).getByRole('button', { name: 'Close' }))
    await expectNoDialog()

    await user.click(screen.getByRole('button', { name: /^Connectivity/ }))
    for (const [page, row] of [
      ['Cellular', 'Operator'],
      ['Hub', 'Bus link'],
      ['Tailscale', 'Status'],
    ]) {
      await user.click(
        await within(await openDialog('Connectivity')).findByRole('button', {
          name: new RegExp(`^${page}`),
        }),
      )
      expect(within(await openDialog(page)).getByText(row)).toBeInTheDocument()
      await user.click(within(await openDialog(page)).getByRole('button', { name: 'Back' }))
    }
    expect(await openDialog('Connectivity')).toBeInTheDocument()
  })

  it('closes the whole drawer on Escape, whatever the depth', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )
    await user.click(
      await within(await openDialog('Display & Appearance')).findByRole('button', {
        name: /^Navigation style/,
      }),
    )
    await openDialog('Navigation')

    await user.keyboard('{Escape}')

    await expectNoDialog()
    expect(screen.getByRole('button', { name: /^General/ })).toBeInTheDocument()
  })

  it('closes the whole drawer with the close control, not one level', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )

    await user.click(
      within(await openDialog('Display & Appearance')).getByRole('button', { name: 'Close' }),
    )

    await expectNoDialog()
    expect(screen.getByRole('button', { name: /^General/ })).toBeInTheDocument()
  })

  it('keeps one drawer open while moving deeper, only swapping its content', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    const dialog = await openDialog('General')

    await user.click(await within(dialog).findByRole('button', { name: /^Display/ }))

    // Same dialog element, new content: it did not close and a second one open.
    expect(await screen.findByRole('dialog', { name: 'Display & Appearance' })).toBe(dialog)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)

    await user.click(within(dialog).getByRole('button', { name: /^Navigation style/ }))
    expect(await screen.findByRole('dialog', { name: 'Navigation' })).toBe(dialog)
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })

  it('has a back arrow that steps up one level and closes the drawer from the first level', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )

    await user.click(
      within(await openDialog('Display & Appearance')).getByRole('button', { name: 'Back' }),
    )
    expect(await openDialog('General')).toBeInTheDocument()

    await user.click(within(await openDialog('General')).getByRole('button', { name: 'Back' }))
    await expectNoDialog()
    expect(screen.getByRole('button', { name: /^General/ })).toBeInTheDocument()
  })

  it('describes Display’s Navigation row as Drawers', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )

    const display = await openDialog('Display & Appearance')
    expect(within(display).getByRole('button', { name: /^Navigation style/ })).toHaveTextContent(
      'Drawers',
    )
  })

  it('keeps Display’s slider, switch and picker working inside the drawer', async () => {
    const { user, value } = renderSettings({ brightness: 70, autoSleepEnabled: true })
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )
    const display = await openDialog('Display & Appearance')

    act(() => within(display).getByRole('slider', { name: 'Brightness' }).focus())
    await user.keyboard('{ArrowRight}')
    expect(value.setBrightness).toHaveBeenCalledExactlyOnceWith(71)

    await user.click(within(display).getByRole('switch', { name: 'Auto-sleep' }))
    expect(value.setAutoSleepEnabled).toHaveBeenCalledExactlyOnceWith(false)

    await user.click(within(display).getByRole('radio', { name: '15m' }))
    expect(value.setAutoSleepTimeoutMinutes).toHaveBeenCalledExactlyOnceWith(15)

    // None of that dismissed the drawer.
    expect(screen.getByRole('dialog', { name: 'Display & Appearance' })).toBeInTheDocument()
  })
})

describe('on a phone', () => {
  it('uses subpages whatever is stored, hides the choice, and leaves the stored value alone', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'drawer')
    const rendered = renderSettings({}, { width: 390 })
    await openNavigation(rendered.user)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Navigation', current: 'page' })).toBeInTheDocument()
    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
    expect(screen.getByText('Settings always uses subpages on a phone.')).toBeInTheDocument()

    await rendered.user.click(screen.getByRole('link', { name: 'Display & Appearance' }))
    expect(screen.getByRole('button', { name: /^Navigation style/ })).toHaveTextContent('Subpages')

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('drawer')
  })

  it('does not overwrite a stored drawer choice when a kiosk shrinks to phone width and back', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'drawer')
    const { user, viewport } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    expect(await openDialog('General')).toBeInTheDocument()

    act(() => viewport.setViewportWidth(390))
    await expectNoDialog()
    expect(screen.getByRole('link', { name: 'General', current: 'page' })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('drawer')

    act(() => viewport.setViewportWidth(1024))
    expect(await openDialog('General')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('drawer')
  })
})
