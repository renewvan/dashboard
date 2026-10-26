import { screen } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { describe, expect, it } from 'vite-plus/test'
import { renderSettings } from '@/test/renderSettings'

async function openWidgets(user: UserEvent) {
  await user.click(screen.getByRole('button', { name: /^General/ }))
  await user.click(screen.getByRole('button', { name: /^Display/ }))
  await user.click(screen.getByRole('button', { name: /^Widgets/ }))
}

describe('Settings › General › Display & Appearance › Widgets', () => {
  it('is reached from Display & Appearance and sits under it in the breadcrumb', async () => {
    const { user } = renderSettings()
    await openWidgets(user)

    expect(screen.getByRole('button', { name: 'Display & Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Widgets' })).toBeInTheDocument()
  })

  it('lists the widgets on the page in order, with their position', async () => {
    const { user } = renderSettings({ startLayout: ['tilt', 'weather'] })
    await openWidgets(user)

    const onPage = screen.getByRole('region', { name: 'On the Start page' })
    const rows = Array.from(onPage.querySelectorAll('li'))
    expect(rows).toHaveLength(2)
    expect(rows[0]).toHaveTextContent('Tilt')
    expect(rows[0]).toHaveTextContent('Position 1 of 2')
    expect(rows[1]).toHaveTextContent('Weather')
  })

  it('lists the widgets that are not on the page as available', async () => {
    const { user } = renderSettings({ startLayout: ['tilt'] })
    await openWidgets(user)

    const available = screen.getByRole('region', { name: 'Available' })
    expect(available).toHaveTextContent('Energy')
    expect(available).not.toHaveTextContent('Tilt')
  })

  it('has nothing available while every widget is on the page', async () => {
    const { user } = renderSettings()
    await openWidgets(user)

    expect(screen.queryByRole('region', { name: 'Available' })).not.toBeInTheDocument()
  })

  it('disables Reset on the shipped page, and restores it from a customised one', async () => {
    const first = renderSettings()
    await openWidgets(first.user)
    expect(screen.getByRole('button', { name: 'Reset to default' })).toBeDisabled()
    first.unmount()

    const { user, value } = renderSettings({ startLayout: ['tilt'] })
    await openWidgets(user)
    await user.click(screen.getByRole('button', { name: 'Reset to default' }))

    expect(value.setStartLayout).toHaveBeenCalledWith([
      'weather',
      'map',
      'energy',
      'solar',
      'tilt',
      'fresh-water',
      'grey-water',
    ])
  })
})

describe('Settings › General › Display & Appearance › Widgets › rows', () => {
  it('has no switch on a row: showing and hiding is on the widget page', async () => {
    const { user } = renderSettings({ startLayout: ['weather', 'tilt'] })
    await openWidgets(user)

    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })
})

describe('Settings › General › Display & Appearance › Widgets › reordering', () => {
  const rowOrder = () =>
    Array.from(
      screen.getByRole('region', { name: 'On the Start page' }).querySelectorAll('li'),
      (li) => li.getAttribute('data-widget-row'),
    )

  /** jsdom has no layout: give each row a 52px box on a 60px pitch. */
  function layOutRows() {
    screen
      .getByRole('region', { name: 'On the Start page' })
      .querySelectorAll('li')
      .forEach((li, i) => {
        li.getBoundingClientRect = () =>
          ({
            top: i * 60,
            height: 52,
            bottom: i * 60 + 52,
            left: 0,
            right: 300,
            width: 300,
          }) as DOMRect
      })
  }

  it('drags a widget down by its grip and commits the new order on release', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather', 'map', 'tilt'] })
    await openWidgets(user)
    layOutRows()

    await user.pointer([
      {
        keys: '[MouseLeft>]',
        target: screen.getByRole('button', { name: 'Reorder Weather' }),
        coords: { clientY: 26 },
      },
      { coords: { clientY: 90 } },
      { coords: { clientY: 150 } },
    ])
    // Nothing is committed while the pointer is down.
    expect(value.setStartLayout).not.toHaveBeenCalled()
    await user.pointer({ keys: '[/MouseLeft]' })

    expect(value.setStartLayout).toHaveBeenCalledWith(['map', 'tilt', 'weather'])
  })

  it('drags a widget up', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather', 'map', 'tilt'] })
    await openWidgets(user)
    layOutRows()

    await user.pointer([
      {
        keys: '[MouseLeft>]',
        target: screen.getByRole('button', { name: 'Reorder Tilt' }),
        coords: { clientY: 146 },
      },
      { coords: { clientY: 80 } },
      { keys: '[/MouseLeft]' },
    ])

    expect(value.setStartLayout).toHaveBeenCalledWith(['weather', 'tilt', 'map'])
  })

  it('changes nothing when the widget is dropped back where it was', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather', 'map', 'tilt'] })
    await openWidgets(user)
    layOutRows()

    await user.pointer([
      {
        keys: '[MouseLeft>]',
        target: screen.getByRole('button', { name: 'Reorder Map' }),
        coords: { clientY: 86 },
      },
      { coords: { clientY: 120 } },
      { coords: { clientY: 88 } },
      { keys: '[/MouseLeft]' },
    ])

    expect(value.setStartLayout).not.toHaveBeenCalled()
    expect(rowOrder()).toEqual(['weather', 'map', 'tilt'])
  })

  it('moves a widget with the arrow keys on its grip', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather', 'map', 'tilt'] })
    await openWidgets(user)

    screen.getByRole('button', { name: 'Reorder Map' }).focus()
    await user.keyboard('{ArrowDown}')
    expect(value.setStartLayout).toHaveBeenLastCalledWith(['weather', 'tilt', 'map'])

    await user.keyboard('{ArrowUp}')
    expect(value.setStartLayout).toHaveBeenLastCalledWith(['map', 'weather', 'tilt'])
  })

  it('gives a widget that is not on the page no grip', async () => {
    const { user } = renderSettings({ startLayout: ['weather'] })
    await openWidgets(user)

    expect(screen.queryByRole('button', { name: 'Reorder Tilt' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reorder Weather' })).toBeInTheDocument()
  })
})

describe('Settings › General › Display & Appearance › Widgets › a widget', () => {
  async function openWidget(user: UserEvent, name: RegExp) {
    await openWidgets(user)
    await user.click(screen.getByRole('button', { name }))
  }

  it('opens from its row, titled by the widget, under Widgets', async () => {
    const { user } = renderSettings()
    await openWidget(user, /^Tilt/)

    expect(screen.getByRole('button', { name: 'Widgets' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Tilt' })).toBeInTheDocument()
  })

  it('hides the widget when switched off', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather', 'tilt', 'map'] })
    await openWidget(user, /^Tilt/)
    await user.click(screen.getByRole('switch', { name: /Show Tilt/ }))

    expect(value.setStartLayout).toHaveBeenCalledWith(['weather', 'map'])
  })

  it('adds a hidden widget at the end when switched on', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather'] })
    await openWidget(user, /^Tilt/)
    await user.click(screen.getByRole('switch', { name: /Show Tilt/ }))

    expect(value.setStartLayout).toHaveBeenCalledWith(['weather', 'tilt'])
  })

  it('counts one tap that reaches the switch twice as one change', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather', 'tilt'] })
    await openWidget(user, /^Tilt/)
    const tilt = screen.getByRole('switch', { name: /Show Tilt/ })
    await user.click(tilt)
    await user.click(tilt)

    expect(value.setStartLayout).toHaveBeenCalledTimes(1)
    expect(value.setStartLayout).toHaveBeenCalledWith(['weather'])
  })

  it('moves the widget up and down', async () => {
    const { user, value } = renderSettings({ startLayout: ['weather', 'tilt', 'map'] })
    await openWidget(user, /^Tilt/)

    await user.click(screen.getByRole('button', { name: /Move up/ }))
    expect(value.setStartLayout).toHaveBeenLastCalledWith(['tilt', 'weather', 'map'])

    await user.click(screen.getByRole('button', { name: /Move down/ }))
    expect(value.setStartLayout).toHaveBeenLastCalledWith(['weather', 'map', 'tilt'])
  })

  it('cannot move the first widget up, and offers no moves while hidden', async () => {
    const first = renderSettings({ startLayout: ['weather', 'tilt'] })
    await openWidget(first.user, /^Weather/)
    expect(screen.getByRole('button', { name: /Move up/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Move down/ })).toBeEnabled()
    first.unmount()

    const hidden = renderSettings({ startLayout: ['weather'] })
    await openWidget(hidden.user, /^Tilt/)
    expect(screen.queryByRole('button', { name: /Move up/ })).not.toBeInTheDocument()
  })
})
