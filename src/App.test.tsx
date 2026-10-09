import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { MqttClient } from 'mqtt'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import App from './App'

vi.mock('mqtt', () => ({
  default: {
    connect: (): MqttClient => {
      const handlers = new Map<string, (...args: unknown[]) => void>()
      const client = {
        on: (event: string, handler: (...args: unknown[]) => void) => {
          handlers.set(event, handler)
        },
        subscribe: vi.fn(),
        publish: vi.fn(),
        end: vi.fn(),
      }
      queueMicrotask(() => handlers.get('connect')?.())
      return client as unknown as MqttClient
    },
  },
}))

const THEME_KEY = 'renewvan-dashboard-theme'
const KIOSK_WIDTH = 800
const PHONE_WIDTH = 390
const JUST_BELOW_KIOSK_WIDTH = 799

const NAV_LABELS = ['Home', 'Power', 'Tanks', 'GPS', 'Switches', 'Heater', 'Settings']

let viewport: MatchMediaStub
let consoleWarn: MockInstance<typeof console.warn>
let consoleError: MockInstance<typeof console.error>

/** Renders and lets the mocked MQTT `connect` microtask land inside `act`. */
async function renderAt(width: number, url = '/') {
  window.history.replaceState(null, '', url)
  viewport = stubMatchMedia(width)
  render(<App />)
  await act(async () => {})
}

/** Crosses a breakpoint and lets React Aria's deferred indicator update settle inside `act`. */
async function resizeTo(width: number) {
  await act(async () => {
    viewport.setViewportWidth(width)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function selectedTab() {
  return screen.queryByRole('tab', { selected: true })
}

beforeEach(() => {
  // jsdom has no Web Animations API; React Aria's tab indicator transition calls it on selection change.
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
  vi.stubEnv('VITE_MQTT_WS_URL', 'ws://test-broker')
  window.localStorage.clear()
  delete document.documentElement.dataset.theme
  consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  expect(consoleWarn).not.toHaveBeenCalled()
  expect(consoleError).not.toHaveBeenCalled()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  viewport.restore()
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
  window.history.replaceState(null, '', '/')
})

describe('App shell navigation layout', () => {
  it('renders one vertical tablist at the kiosk width', async () => {
    await renderAt(KIOSK_WIDTH)
    const lists = screen.getAllByRole('tablist')
    expect(lists).toHaveLength(1)
    expect(lists[0]).toHaveAttribute('aria-orientation', 'vertical')
    expect(within(lists[0]).getAllByRole('tab')).toHaveLength(NAV_LABELS.length)
  })

  it('renders the bottom bar, still one tablist, one pixel below the kiosk width', async () => {
    await renderAt(JUST_BELOW_KIOSK_WIDTH)
    const lists = screen.getAllByRole('tablist')
    expect(lists).toHaveLength(1)
    expect(lists[0]).toHaveAttribute('aria-orientation', 'horizontal')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toContainElement(lists[0])
  })

  it('names every nav tab and keeps the primary tabs in order', async () => {
    await renderAt(KIOSK_WIDTH)
    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label'))).toEqual(
      NAV_LABELS,
    )
  })

  it('swaps between the rail and the bottom bar when the viewport crosses the breakpoint', async () => {
    await renderAt(KIOSK_WIDTH)
    await resizeTo(JUST_BELOW_KIOSK_WIDTH)
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'horizontal')
    await resizeTo(KIOSK_WIDTH)
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-orientation', 'vertical')
  })

  it('keeps the selected pane when the layout swaps', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Tanks' }))
    await resizeTo(JUST_BELOW_KIOSK_WIDTH)
    expect(screen.getByRole('tab', { name: 'Tanks' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('pane-tanks')).toBeInTheDocument()
  })

  it('puts the navigation before the panes in the DOM on a phone', async () => {
    await renderAt(PHONE_WIDTH)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const pane = screen.getByTestId('pane-home')
    expect(nav.compareDocumentPosition(pane) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('App shell tab selection', () => {
  it('starts on Home with its pane visible', async () => {
    await renderAt(KIOSK_WIDTH)
    expect(selectedTab()).toHaveAccessibleName('Home')
    expect(screen.getByTestId('pane-home')).toBeInTheDocument()
  })

  it.each([
    ['kiosk', KIOSK_WIDTH],
    ['phone', PHONE_WIDTH],
  ])('selecting a tab swaps the pane (%s)', async (_name, width) => {
    const user = userEvent.setup()
    await renderAt(width)
    await user.click(screen.getByRole('tab', { name: 'Power' }))
    expect(selectedTab()).toHaveAccessibleName('Power')
    expect(screen.getByTestId('pane-power')).toBeInTheDocument()
    expect(screen.queryByTestId('pane-home')).not.toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get('tab')).toBe('power')
  })

  it('shows the stub pane heading for the selected tab', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Heater' }))
    expect(screen.getByRole('heading', { name: 'Heater' })).toBeInTheDocument()
  })
})

describe('App shell alerts bell', () => {
  it.each([
    ['kiosk', KIOSK_WIDTH],
    ['phone', PHONE_WIDTH],
  ])('opens the alerts pane with no tab selected (%s)', async (_name, width) => {
    const user = userEvent.setup()
    await renderAt(width)
    const bell = screen.getByRole('button', { name: /^alerts/i })
    expect(bell).not.toHaveAttribute('aria-current')
    await user.click(bell)
    expect(screen.getByTestId('pane-alerts')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Alerts' })).toBeInTheDocument()
    expect(bell).toHaveAttribute('aria-current', 'page')
    expect(selectedTab()).toBeNull()
  })

  it('selecting a tab afterwards leaves the alerts pane', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('button', { name: /^alerts/i }))
    await user.click(screen.getByRole('tab', { name: 'Home' }))
    expect(screen.queryByTestId('pane-alerts')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^alerts/i })).not.toHaveAttribute('aria-current')
    expect(selectedTab()).toHaveAccessibleName('Home')
  })

  it('deep-links to the alerts pane via ?tab=alerts', async () => {
    await renderAt(KIOSK_WIDTH, '/?tab=alerts')
    expect(screen.getByTestId('pane-alerts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^alerts/i })).toHaveAttribute('aria-current', 'page')
  })
})

describe('App shell URL state', () => {
  it('opens the tab named by ?tab= on load', async () => {
    await renderAt(KIOSK_WIDTH, '/?tab=gps')
    expect(selectedTab()).toHaveAccessibleName('GPS')
    expect(screen.getByTestId('pane-gps')).toBeInTheDocument()
  })

  it('falls back to Home for an unknown ?tab=', async () => {
    await renderAt(KIOSK_WIDTH, '/?tab=bogus')
    expect(selectedTab()).toHaveAccessibleName('Home')
    expect(screen.getByTestId('pane-home')).toBeInTheDocument()
  })

  it('follows browser Back and Forward', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Power' }))
    await user.click(screen.getByRole('tab', { name: 'Tanks' }))
    expect(screen.getByTestId('pane-tanks')).toBeInTheDocument()

    act(() => window.history.back())
    await waitFor(() => expect(screen.getByTestId('pane-power')).toBeInTheDocument())
    expect(selectedTab()).toHaveAccessibleName('Power')

    act(() => window.history.forward())
    await waitFor(() => expect(screen.getByTestId('pane-tanks')).toBeInTheDocument())
    expect(selectedTab()).toHaveAccessibleName('Tanks')
  })
})

describe('App shell theme', () => {
  it('defaults to dark', async () => {
    await renderAt(KIOSK_WIDTH)
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('applies a saved theme on load', async () => {
    window.localStorage.setItem(THEME_KEY, 'light')
    await renderAt(KIOSK_WIDTH)
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
  })

  it('toggling flips data-theme on <html> and persists the choice', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('button', { name: 'Switch to light theme' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light')

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('dark')
  })
})

describe('App shell header', () => {
  it('shows every header control at phone width', async () => {
    await renderAt(PHONE_WIDTH)
    expect(screen.getByRole('img', { name: 'renewvan' })).toBeInTheDocument()
    expect(screen.getByTestId('clock')).toBeInTheDocument()
    expect(screen.getByTestId('uplink-status-button')).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^alerts/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to .* theme/i })).toBeInTheDocument()
    expect(screen.getByTestId('display-sleep-button')).toBeInTheDocument()
  })

  it('opens the uplink popover from the header', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByTestId('uplink-status-button'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('jumps to Settings from the uplink popover CTA', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByTestId('uplink-status-button'))
    await user.click(await screen.findByRole('button', { name: /network settings/i }))
    expect(selectedTab()).toHaveAccessibleName('Settings')
    expect(screen.getByTestId('pane-settings')).toBeInTheDocument()
  })
})
