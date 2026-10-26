import { act, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'

const NAV_STYLE_KEY = 'renewvan-dashboard-settings-nav-style'

async function openDisplay(
  overrides: Parameters<typeof renderSettings>[0] = {},
  options: Parameters<typeof renderSettings>[1] = {},
) {
  const rendered = renderSettings(overrides, options)
  await rendered.user.click(screen.getByRole('button', { name: /^General/ }))
  await rendered.user.click(screen.getByRole('button', { name: /^Display/ }))
  return rendered
}

describe('Settings › General › Display & Appearance', () => {
  it('is reached from a General row described as Theme, brightness, auto-sleep, layout', async () => {
    const { user } = renderSettings()
    await user.click(screen.getByRole('button', { name: /^General/ }))

    expect(screen.getByRole('button', { name: /^Display/ })).toHaveTextContent(
      'Theme, brightness, auto-sleep, layout',
    )

    await user.click(screen.getByRole('button', { name: /^Display/ }))

    expect(screen.getByRole('button', { name: 'General' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Display & Appearance' })).toBeInTheDocument()
  })

  it('shows the live brightness readout and slider', async () => {
    await openDisplay({ brightness: 42 })

    expect(screen.getByText('42%')).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveValue('42')
  })

  describe('groups', () => {
    it('puts the screen controls under Display and the layout rows under Appearance', async () => {
      await openDisplay({ autoSleepEnabled: false })

      expect(screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual([
        'Appearance',
        'Display',
      ])
      const display = within(screen.getByRole('region', { name: 'Display' }))
      expect(display.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
      expect(display.getByRole('slider', { name: 'Brightness' })).toBeInTheDocument()
      expect(display.getByRole('switch', { name: 'Auto-sleep' })).toBeInTheDocument()

      const appearance = within(screen.getByRole('region', { name: 'Appearance' }))
      expect(appearance.getAllByRole('button').map((row) => row.textContent)).toContain(
        'Start pageStart view: Cockpit',
      )
      expect(
        appearance.getByRole('radiogroup', { name: 'Navigation position' }),
      ).toBeInTheDocument()
      expect(appearance.getByRole('radiogroup', { name: 'Navigation style' })).toBeInTheDocument()
    })

    it('lists Widgets, then Pages and Navigation as groups inside Appearance', async () => {
      await openDisplay()

      const appearance = within(screen.getByRole('region', { name: 'Appearance' }))
      expect(appearance.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
        'Pages',
        'Navigation',
      ])

      const widgets = appearance.getByRole('button', { name: /^Widgets/ })
      const pages = appearance.getByRole('region', { name: 'Pages' })
      const navigation = appearance.getByRole('region', { name: 'Navigation' })
      const before = (a: Element, b: Element) =>
        Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
      expect(before(widgets, pages)).toBe(true)
      expect(before(pages, navigation)).toBe(true)

      expect(
        within(pages)
          .getAllByRole('button')
          .map((row) => row.textContent),
      ).toEqual([
        'Start pageStart view: Cockpit',
        'Power pageVan tiles or van orbs',
        expect.stringMatching(/^Map page/),
      ])
      expect(
        within(navigation).getByRole('radiogroup', { name: 'Navigation position' }),
      ).toBeInTheDocument()
      expect(
        within(navigation).getByRole('radiogroup', { name: 'Navigation style' }),
      ).toBeInTheDocument()
    })

    it('puts Appearance before Display', async () => {
      await openDisplay()

      const appearance = screen.getByRole('region', { name: 'Appearance' })
      const display = screen.getByRole('region', { name: 'Display' })
      expect(
        appearance.compareDocumentPosition(display) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
    })
  })

  describe('navigation position', () => {
    it.each([
      ['left', 'Left'],
      ['bottom', 'Bottom'],
    ] as const)('shows the %s position as the selected choice', async (navbarPosition, label) => {
      await openDisplay({ navbarPosition })

      expect(screen.getByRole('radio', { name: label })).toBeChecked()
    })

    it('asks for the other position exactly once, and nothing on a re-tap of the current one', async () => {
      const { user, value } = await openDisplay({ navbarPosition: 'left' })

      await user.click(screen.getByRole('radio', { name: 'Left' }))
      expect(value.setNavbarPosition).not.toHaveBeenCalled()

      await user.click(screen.getByRole('radio', { name: 'Bottom' }))
      expect(value.setNavbarPosition).toHaveBeenCalledExactlyOnceWith('bottom')
    })

    it('is fixed at Bottom and disabled on a phone, leaving the stored choice alone', async () => {
      const { value } = await openDisplay({ navbarPosition: 'left' }, { width: 390 })

      expect(screen.getByRole('radio', { name: 'Bottom' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'Left' })).toBeDisabled()
      expect(screen.getByRole('radio', { name: 'Bottom' })).toBeDisabled()
      expect(value.setNavbarPosition).not.toHaveBeenCalled()
    })
  })

  describe('navigation style', () => {
    beforeEach(() => {
      window.localStorage.clear()
    })

    it('defaults to subpages', async () => {
      await openDisplay()

      expect(screen.getByRole('radio', { name: 'Subpages' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'Drawers' })).not.toBeChecked()
    })

    it('keeps the default when the stored value is not a known style', async () => {
      window.localStorage.setItem(NAV_STYLE_KEY, 'carousel')
      await openDisplay()

      expect(screen.getByRole('radio', { name: 'Subpages' })).toBeChecked()
    })

    it('persists the choice across remounts', async () => {
      const first = await openDisplay()
      await first.user.click(screen.getByRole('radio', { name: 'Drawers' }))

      expect(window.localStorage.getItem(NAV_STYLE_KEY)).toBe('drawer')
      first.unmount()

      const second = renderSettings()
      await second.user.click(screen.getByRole('button', { name: /^General/ }))

      expect(await screen.findByRole('dialog', { name: 'General' })).toBeInTheDocument()
    })

    it('is fixed at Subpages and disabled on a phone, leaving the stored choice alone', async () => {
      window.localStorage.setItem(NAV_STYLE_KEY, 'drawer')
      await openDisplay({}, { width: 390 })

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(screen.getByRole('radio', { name: 'Subpages' })).toBeChecked()
      expect(screen.getByRole('radio', { name: 'Subpages' })).toBeDisabled()
      expect(screen.getByRole('radio', { name: 'Drawers' })).toBeDisabled()
      expect(window.localStorage.getItem(NAV_STYLE_KEY)).toBe('drawer')
    })
  })

  describe('theme', () => {
    it.each([
      ['dark', 'Dark'],
      ['light', 'Light'],
    ] as const)('shows the %s theme as the selected choice', async (theme, label) => {
      await openDisplay({ theme })

      expect(screen.getByRole('radio', { name: label })).toBeChecked()
    })

    it('sends the other theme when it is picked', async () => {
      const { user, value } = await openDisplay({ theme: 'dark' })

      await user.click(screen.getByRole('radio', { name: 'Light' }))

      expect(value.setTheme).toHaveBeenCalledExactlyOnceWith('light')
    })

    it('sends nothing when the selected theme is tapped again', async () => {
      const { user, value } = await openDisplay({ theme: 'dark' })

      await user.click(screen.getByRole('radio', { name: 'Dark' }))

      expect(value.setTheme).not.toHaveBeenCalled()
    })
  })

  describe('brightness', () => {
    it('sends exactly one command per keyboard step', async () => {
      const { user, value } = await openDisplay({ brightness: 70 })

      act(() => screen.getByRole('slider', { name: 'Brightness' }).focus())
      await user.keyboard('{ArrowRight}')

      // A key press fires both `onChange` and `onChangeEnd`; only one may publish.
      expect(value.setBrightness).toHaveBeenCalledExactlyOnceWith(71)
    })

    it('sends one command for every further step', async () => {
      const { user, value } = await openDisplay({ brightness: 70 })

      act(() => screen.getByRole('slider', { name: 'Brightness' }).focus())
      await user.keyboard('{ArrowLeft}{PageUp}')

      expect(value.setBrightness).toHaveBeenCalledTimes(2)
      expect(value.setBrightness).toHaveBeenNthCalledWith(1, 69)
      expect(value.setBrightness).toHaveBeenNthCalledWith(2, 80)
    })
  })

  describe('auto-sleep', () => {
    it('toggles from the whole row, including its label, and sends the new value', async () => {
      const { user, value } = await openDisplay({ autoSleepEnabled: false })

      await user.click(screen.getByText('Auto-sleep'))

      expect(value.setAutoSleepEnabled).toHaveBeenCalledExactlyOnceWith(true)
    })

    it('sends false when turned off', async () => {
      const { user, value } = await openDisplay({ autoSleepEnabled: true })

      await user.click(screen.getByRole('switch', { name: /^Auto-sleep/ }))

      expect(value.setAutoSleepEnabled).toHaveBeenCalledExactlyOnceWith(false)
    })
  })

  describe('sleep after', () => {
    it('is hidden while auto-sleep is off', async () => {
      await openDisplay({ autoSleepEnabled: false })

      expect(screen.queryByRole('radiogroup', { name: 'Sleep after' })).not.toBeInTheDocument()
    })

    it('offers 1m 5m 15m 30m with the retained value selected while auto-sleep is on', async () => {
      await openDisplay({ autoSleepEnabled: true, autoSleepTimeoutMinutes: 15 })

      const group = screen.getByRole('radiogroup', { name: 'Sleep after' })
      expect(group).toBeInTheDocument()
      expect(
        within(group)
          .getAllByRole('radio')
          .map((radio) => radio.textContent),
      ).toEqual(['1m', '5m', '15m', '30m'])
      expect(screen.getByRole('radio', { name: '15m' })).toBeChecked()
      expect(screen.getByRole('radio', { name: '5m' })).not.toBeChecked()
    })

    it('sends the new timeout when another value is picked', async () => {
      const { user, value } = await openDisplay({
        autoSleepEnabled: true,
        autoSleepTimeoutMinutes: 5,
      })

      await user.click(screen.getByRole('radio', { name: '30m' }))

      expect(value.setAutoSleepTimeoutMinutes).toHaveBeenCalledExactlyOnceWith(30)
    })

    it('sends nothing when the selected value is tapped again', async () => {
      const { user, value } = await openDisplay({
        autoSleepEnabled: true,
        autoSleepTimeoutMinutes: 5,
      })

      await user.click(screen.getByRole('radio', { name: '5m' }))

      expect(value.setAutoSleepTimeoutMinutes).not.toHaveBeenCalled()
    })
  })

  describe('before the hub has published', () => {
    it('shows a dash and disables the slider and switch', async () => {
      await openDisplay({
        brightness: null,
        autoSleepEnabled: null,
        autoSleepTimeoutMinutes: null,
      })

      expect(screen.getByText('—')).toBeInTheDocument()
      expect(screen.getByRole('slider', { name: 'Brightness' })).toBeDisabled()
      expect(screen.getByRole('switch', { name: 'Auto-sleep' })).toBeDisabled()
      expect(screen.queryByRole('radiogroup', { name: 'Sleep after' })).not.toBeInTheDocument()
    })

    it('disables the timeout picker when auto-sleep is on but its timeout is unknown', async () => {
      await openDisplay({ autoSleepEnabled: true, autoSleepTimeoutMinutes: null })

      for (const radio of within(
        screen.getByRole('radiogroup', { name: 'Sleep after' }),
      ).getAllByRole('radio')) {
        expect(radio).toBeDisabled()
        expect(radio).not.toBeChecked()
      }
    })
  })
})
