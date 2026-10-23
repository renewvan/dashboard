import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vite-plus/test'
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

/** The drawer that is open (the previous one may still be sliding out). */
async function openDialog(name: string) {
  return screen.findByRole('dialog', { name })
}

async function expectNoDialog() {
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
}

describe('switching to subpages from a drawer', () => {
  it('goes back to subpages inline, closing the drawer and staying on Display', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'drawer')
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )

    const display = await openDialog('Display & Appearance')
    expect(within(display).getByRole('radio', { name: 'Drawers' })).toBeChecked()
    await user.click(within(display).getByRole('radio', { name: 'Subpages' }))

    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('subpage')
    await expectNoDialog()
    expect(screen.getByRole('heading', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Subpages' })).toBeChecked()
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
        .filter((text) => /^(Router|Hub|Tailscale)/.test(text ?? '')),
    ).toEqual(['RouterLTE · O2', 'HubConnected', 'Tailscale100.64.0.1'])
    // The page behind the drawer is still the top list, not a breadcrumbed subpage.
    expect(screen.getByRole('heading', { name: 'Settings', hidden: true })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('renders the pages added by other tickets in their own drawers, replacing the parent in place', async () => {
    const { user } = renderSettings(
      {},
      {
        bus: {
          temperatures: {
            outdoor: {
              name: 'Outdoor',
              unit: 'C',
              source: 'w1',
              temperature_c: 31.4,
              status: 'ok',
            },
          },
        },
      },
    )

    await user.click(screen.getByRole('button', { name: /^Drivers/ }))
    // No Driver publishes info, so the sensor sits in a fallback row: open it, then Temperature.
    await user.click(
      await within(await openDialog('Drivers')).findByRole('button', { name: /^Temperature/ }),
    )
    await user.click(
      await within(await screen.findByRole('list', { name: 'Entities' })).findByRole('button', {
        name: /^Temperature/,
      }),
    )
    const temperature = await openDialog('Temperature')
    expect(within(temperature).getByRole('textbox', { name: 'Name' })).toHaveValue('Outdoor')
    await user.click(within(temperature).getByRole('button', { name: 'Back' }))
    expect(await openDialog('Drivers')).toBeInTheDocument()
    await user.click(within(await openDialog('Drivers')).getByRole('button', { name: 'Close' }))
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
      ['Router', 'Operator'],
      ['Hub', 'Broker'],
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

  it('opens About in its own drawer over General, loading its software licences', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^About/ }),
    )

    const about = await openDialog('About')
    expect(
      await within(about).findByRole('list', { name: 'Software licences' }, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(within(about).getByText('© OpenStreetMap contributors')).toBeInTheDocument()
    await user.click(within(about).getByRole('button', { name: 'Back' }))
    expect(await openDialog('General')).toBeInTheDocument()
  })

  it('closes the whole drawer on Escape', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )
    await openDialog('Display & Appearance')

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

  it('shows Display’s Navigation style toggle on Drawers', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    await user.click(
      await within(await openDialog('General')).findByRole('button', { name: /^Display/ }),
    )

    const display = await openDialog('Display & Appearance')
    expect(within(display).getByRole('radio', { name: 'Drawers' })).toBeChecked()
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

    await user.click(within(display).getByRole('switch', { name: /^Auto-sleep/ }))
    expect(value.setAutoSleepEnabled).toHaveBeenCalledExactlyOnceWith(false)

    await user.click(within(display).getByRole('radio', { name: '15m' }))
    expect(value.setAutoSleepTimeoutMinutes).toHaveBeenCalledExactlyOnceWith(15)

    // None of that dismissed the drawer.
    expect(screen.getByRole('dialog', { name: 'Display & Appearance' })).toBeInTheDocument()
  })
})

describe('on a phone', () => {
  it('does not overwrite a stored drawer choice when a kiosk shrinks to phone width and back', async () => {
    window.localStorage.setItem(STORAGE_KEY, 'drawer')
    const { user, viewport } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))
    expect(await openDialog('General')).toBeInTheDocument()

    act(() => viewport.setViewportWidth(390))
    await expectNoDialog()
    expect(screen.getByRole('heading', { name: 'General' })).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('drawer')

    act(() => viewport.setViewportWidth(1024))
    expect(await openDialog('General')).toBeInTheDocument()
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('drawer')
  })
})
