import { act, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderSettings } from '@/test/renderSettings'

async function openDisplay(overrides: Parameters<typeof renderSettings>[0] = {}) {
  const rendered = renderSettings(overrides)
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

    expect(screen.getByRole('link', { name: 'General' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Display & Appearance', current: 'page' }),
    ).toBeInTheDocument()
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
        'Display',
        'Appearance',
      ])
      const display = within(screen.getByRole('region', { name: 'Display' }))
      expect(display.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()
      expect(display.getByRole('slider', { name: 'Brightness' })).toBeInTheDocument()
      expect(display.getByRole('switch', { name: 'Auto-sleep' })).toBeInTheDocument()

      const appearance = within(screen.getByRole('region', { name: 'Appearance' }))
      expect(appearance.getAllByRole('button').map((row) => row.textContent)).toEqual([
        'Start pagePower readings and scales',
        'Navigation positionLeft',
        'Navigation styleSubpages',
      ])
    })

    it('separates the Start page row from the two navigation rows', async () => {
      await openDisplay()

      const appearance = screen.getByRole('region', { name: 'Appearance' })
      const divider = within(appearance).getByRole('separator')
      const after = (row: RegExp) =>
        divider.compareDocumentPosition(within(appearance).getByRole('button', { name: row })) &
        Node.DOCUMENT_POSITION_FOLLOWING
      const before = (row: RegExp) =>
        divider.compareDocumentPosition(within(appearance).getByRole('button', { name: row })) &
        Node.DOCUMENT_POSITION_PRECEDING
      expect(before(/^Start page/)).toBeTruthy()
      expect(after(/^Navigation position/)).toBeTruthy()
      expect(after(/^Navigation style/)).toBeTruthy()
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

      await user.click(screen.getByRole('switch', { name: 'Auto-sleep' }))

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
