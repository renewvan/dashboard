import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import { toast } from '@heroui/react'
import type { MqttClient } from 'mqtt'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vite-plus/test'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import App from './App'

type MessageHandler = (topic: string, message: { toString: () => string }) => void

/**
 * The mocked clients' `message` handlers and the shared `publish` spy, reachable from the tests so
 * they can inject bus messages as the broker would and assert on what the app publishes.
 */
const mqtt = vi.hoisted(() => ({
  messageHandlers: new Set<MessageHandler>(),
  publish: vi.fn(),
}))

vi.mock('mqtt', () => ({
  default: {
    connect: (): MqttClient => {
      const handlers = new Map<string, (...args: unknown[]) => void>()
      const client = {
        on: (event: string, handler: (...args: unknown[]) => void) => {
          handlers.set(event, handler)
          if (event === 'message') mqtt.messageHandlers.add(handler as MessageHandler)
        },
        subscribe: vi.fn(),
        publish: mqtt.publish,
        end: vi.fn(() => {
          const message = handlers.get('message')
          if (message) mqtt.messageHandlers.delete(message as MessageHandler)
        }),
      }
      queueMicrotask(() => handlers.get('connect')?.())
      return client as unknown as MqttClient
    },
  },
}))

/** Delivers a retained message to the app as the broker would. */
async function receive(topic: string, payload: string) {
  await act(async () => {
    for (const handler of mqtt.messageHandlers) handler(topic, { toString: () => payload })
  })
}

const THEME_KEY = 'renewvan-dashboard-theme'
const KIOSK_WIDTH = 800
const PHONE_WIDTH = 390
const JUST_BELOW_KIOSK_WIDTH = 799

const NAV_LABELS = ['Start', 'Power', 'Tanks', 'GPS', 'Relays', 'Heater', 'Settings']

const HEADER_HEIGHT_VAR = '--app-header-height'

const POSITION_KEY = 'renewvan-dashboard-navbar-position'

/** jsdom has no layout or ResizeObserver: the stub exposes the observer callbacks, and the header's `offsetHeight` is whatever the test sets. */
let headerHeight = 0
const resizeCallbacks = new Set<() => void>()

class StubResizeObserver {
  private readonly callback: () => void
  constructor(callback: () => void) {
    this.callback = callback
  }
  observe() {
    resizeCallbacks.add(this.callback)
  }
  unobserve() {
    resizeCallbacks.delete(this.callback)
  }
  disconnect() {
    resizeCallbacks.delete(this.callback)
  }
}

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

/** A tank that has published every property `useAlertToasts` needs, in alarm. */
async function receiveAlarmingTank() {
  const properties = {
    fluid_type: 'fresh_water',
    capacity_l: 100,
    level_pct: 5,
    status: 'ok',
    volume_since_full_l: 95,
    volume_since_empty_l: 5,
    alarm_state: 'alarm',
  }
  for (const [property, value] of Object.entries(properties)) {
    await receive(`renewvan/tank/fresh/${property}`, JSON.stringify(value))
  }
}

/** Crosses a breakpoint and lets React Aria's deferred indicator update settle inside `act`. */
async function resizeTo(width: number) {
  await act(async () => {
    viewport.setViewportWidth(width)
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

function selectedPage() {
  return screen.queryByRole('tab', { selected: true })
}

/** Taps Network settings in the uplink popover. */
async function openCellularFromUplink(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('uplink-status-button'))
  await user.click(await screen.findByRole('button', { name: /network settings/i }))
}

/** The open Settings view: a subpage's navigation bar titles it with the pane's `h1`. */
function currentView() {
  const pane = screen.getByTestId('pane-settings')
  return within(pane).queryByRole('heading', { level: 1 })
}

function expectInCellular() {
  expect(screen.getByTestId('pane-settings')).toBeInTheDocument()
  expect(currentView()).toHaveAccessibleName('Cellular')
}

/** The top list: Settings' own title and its three rows, with no back button above them. */
function expectTopList() {
  const pane = screen.getByTestId('pane-settings')
  expect(within(pane).getAllByRole('button')).toHaveLength(3)
  expect(within(pane).getByRole('heading', { name: 'Settings' })).toBeInTheDocument()
}

/** jsdom delivers `popstate` on a later task: wait for it, then let React settle. */
async function traverseHistory(go: () => void) {
  await act(async () => {
    const popped = new Promise((resolve) =>
      window.addEventListener('popstate', resolve, { once: true }),
    )
    go()
    await popped
  })
}

const goBack = () => traverseHistory(() => window.history.back())
const goForward = () => traverseHistory(() => window.history.forward())

beforeEach(() => {
  headerHeight = 49
  mqtt.messageHandlers.clear()
  mqtt.publish.mockClear()
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get() {
      return this.tagName === 'HEADER' ? headerHeight : 0
    },
  })
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
  Reflect.deleteProperty(HTMLElement.prototype, 'offsetHeight')
  resizeCallbacks.clear()
  vi.unstubAllGlobals()
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
    await user.click(screen.getByRole('tab', { name: 'Power' }))
    await resizeTo(JUST_BELOW_KIOSK_WIDTH)
    expect(screen.getByRole('tab', { name: 'Power' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('pane-power')).toBeInTheDocument()
  })

  it('puts the navigation before the panes in the DOM on a phone', async () => {
    await renderAt(PHONE_WIDTH)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    const pane = screen.getByTestId('pane-start')
    expect(nav.compareDocumentPosition(pane) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})

describe('App shell page selection', () => {
  it('starts on Start with its pane visible', async () => {
    await renderAt(KIOSK_WIDTH)
    expect(selectedPage()).toHaveAccessibleName('Start')
    expect(screen.getByTestId('pane-start')).toBeInTheDocument()
  })

  it.each([
    ['kiosk', KIOSK_WIDTH],
    ['phone', PHONE_WIDTH],
  ])('selecting a page swaps the pane (%s)', async (_name, width) => {
    const user = userEvent.setup()
    await renderAt(width)
    await user.click(screen.getByRole('tab', { name: 'Power' }))
    expect(selectedPage()).toHaveAccessibleName('Power')
    expect(screen.getByTestId('pane-power')).toBeInTheDocument()
    expect(screen.queryByTestId('pane-start')).not.toBeInTheDocument()
    expect(new URLSearchParams(window.location.search).get('page')).toBe('power')
  })

  it('shows the stub pane heading for the selected page', async () => {
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
  ])('opens the alerts pane with no page selected (%s)', async (_name, width) => {
    const user = userEvent.setup()
    await renderAt(width)
    const bell = screen.getByRole('button', { name: /^alerts/i })
    expect(bell).not.toHaveAttribute('aria-current')
    await user.click(bell)
    expect(screen.getByTestId('pane-alerts')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Alerts' })).toBeInTheDocument()
    expect(bell).toHaveAttribute('aria-current', 'page')
    expect(selectedPage()).toBeNull()
  })

  it('selecting a page afterwards leaves the alerts pane', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('button', { name: /^alerts/i }))
    await user.click(screen.getByRole('tab', { name: 'Start' }))
    expect(screen.queryByTestId('pane-alerts')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^alerts/i })).not.toHaveAttribute('aria-current')
    expect(selectedPage()).toHaveAccessibleName('Start')
  })

  it('deep-links to the alerts pane via ?page=alerts', async () => {
    await renderAt(KIOSK_WIDTH, '/?page=alerts')
    expect(screen.getByTestId('pane-alerts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^alerts/i })).toHaveAttribute('aria-current', 'page')
  })

  it('badges the bell with the unseen count until the page is visited', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    expect(screen.queryByTestId('alerts-button-badge')).not.toBeInTheDocument()

    // The real queue: the badge counts toasts as they appear, however they are dismissed.
    await act(async () => {
      toast.danger('Fresh water tank alarm', { timeout: 0 })
    })
    expect(screen.getByTestId('alerts-button-badge')).toHaveTextContent('1')

    await user.click(screen.getByRole('button', { name: 'Alerts, 1 active' }))
    expect(screen.queryByTestId('alerts-button-badge')).not.toBeInTheDocument()

    await act(async () => toast.clear())
  })
})

describe('App shell URL state', () => {
  it('opens the page named by ?page= on load', async () => {
    await renderAt(KIOSK_WIDTH, '/?page=gps')
    expect(selectedPage()).toHaveAccessibleName('GPS')
    expect(screen.getByTestId('pane-gps')).toBeInTheDocument()
  })

  it('falls back to Start for an unknown ?page=', async () => {
    await renderAt(KIOSK_WIDTH, '/?page=bogus')
    expect(selectedPage()).toHaveAccessibleName('Start')
    expect(screen.getByTestId('pane-start')).toBeInTheDocument()
  })

  it('follows browser Back and Forward', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Power' }))
    await user.click(screen.getByRole('tab', { name: 'GPS' }))
    expect(screen.getByTestId('pane-gps')).toBeInTheDocument()

    act(() => window.history.back())
    await waitFor(() => expect(screen.getByTestId('pane-power')).toBeInTheDocument())
    expect(selectedPage()).toHaveAccessibleName('Power')

    act(() => window.history.forward())
    await waitFor(() => expect(screen.getByTestId('pane-gps')).toBeInTheDocument())
    expect(selectedPage()).toHaveAccessibleName('GPS')
  })
})

/** Publishes one tank property-by-property over the mocked bus, as the hub does. */
async function receiveTank(id: string, properties: Record<string, unknown>) {
  for (const [property, value] of Object.entries(properties)) {
    await receive(`renewvan/tank/${id}/${property}`, JSON.stringify(value))
  }
}

const FRESH_TANK = {
  fluid_type: 'fresh_water',
  capacity_l: 100,
  level_pct: 62,
  status: 'ok',
  volume_since_full_l: 0,
  volume_since_empty_l: 0,
}

describe('App shell Tanks page', () => {
  it('shows a card per reported tank at the kiosk width, with the scale', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await receiveTank('fresh', FRESH_TANK)
    await receiveTank('grey', { ...FRESH_TANK, fluid_type: 'grey_water', level_pct: 41 })
    await user.click(screen.getByRole('tab', { name: 'Tanks' }))
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.getByText('Grey water')).toBeInTheDocument()
    expect(screen.getAllByTestId('tank-scale')).toHaveLength(2)
  })

  it('shows rows with no scale one pixel below the kiosk width', async () => {
    const user = userEvent.setup()
    await renderAt(JUST_BELOW_KIOSK_WIDTH)
    await receiveTank('fresh', FRESH_TANK)
    await user.click(screen.getByRole('tab', { name: 'Tanks' }))
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
    expect(screen.queryByTestId('tank-scale')).not.toBeInTheDocument()
  })

  it('swaps card for row when the viewport crosses the breakpoint', async () => {
    await renderAt(KIOSK_WIDTH, '/?page=tanks')
    await receiveTank('fresh', FRESH_TANK)
    expect(screen.getAllByTestId('tank-scale')).toHaveLength(1)
    await resizeTo(JUST_BELOW_KIOSK_WIDTH)
    expect(screen.queryByTestId('tank-scale')).not.toBeInTheDocument()
    expect(screen.getByText('Fresh water')).toBeInTheDocument()
  })

  it.each([
    ['kiosk', KIOSK_WIDTH],
    ['phone', PHONE_WIDTH],
  ])(
    'opens the tank settings from Configure, and Back returns to Tanks (%s)',
    async (_name, width) => {
      const user = userEvent.setup()
      await renderAt(width)
      await receiveTank('fresh', FRESH_TANK)
      await receiveTank('grey', { ...FRESH_TANK, fluid_type: 'grey_water', level_pct: 41 })
      await user.click(screen.getByRole('tab', { name: 'Tanks' }))

      await user.click(screen.getAllByRole('button', { name: 'Configure' })[1])

      expect(selectedPage()).toHaveAccessibleName('Settings')
      expect(screen.getByRole('heading', { name: 'Grey water' })).toBeInTheDocument()
      expect(screen.getByRole('switch', { name: 'Enabled' })).toBeDisabled()
      expect(window.location.search).toBe('?page=settings&view=tank&tank=grey')

      act(() => window.history.back())
      await waitFor(() => expect(selectedPage()).toHaveAccessibleName('Tanks'))
      expect(screen.getByText('Grey water')).toBeInTheDocument()
    },
  )

  it('drops the open tank when leaving Settings for another page', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=settings&view=tank&tank=fresh')
    await receiveTank('fresh', FRESH_TANK)

    await user.click(screen.getByRole('tab', { name: 'Power' }))

    expect(window.location.search).toBe('?page=power')
  })

  it('shows the empty state when no tank has reported', async () => {
    await renderAt(KIOSK_WIDTH, '/?page=tanks')
    expect(screen.getByText('No tank data yet.')).toBeInTheDocument()
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

  it('is the same theme in Settings and the header toggle, whichever one changes it', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = within(screen.getByTestId('pane-settings'))
    await user.click(pane.getByRole('button', { name: /^General/ }))
    await user.click(pane.getByRole('button', { name: /^Display/ }))
    expect(pane.getByRole('radio', { name: 'Dark' })).toBeChecked()

    await user.click(pane.getByRole('radio', { name: 'Light' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(window.localStorage.getItem(THEME_KEY)).toBe('light')
    expect(screen.getByRole('button', { name: 'Switch to dark theme' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Switch to dark theme' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(pane.getByRole('radio', { name: 'Dark' })).toBeChecked()
  })
})

describe('App shell header', () => {
  it('takes the logo to the Start page from anywhere, dropping the Settings view, in one history entry', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=settings&view=display')
    expect(selectedPage()).toHaveAccessibleName('Settings')
    const entries = window.history.length

    const logo = within(screen.getByRole('banner')).getByRole('link', { name: 'renewvan' })
    expect(logo).toHaveAttribute('href', '?page=start')
    await user.click(logo)

    expect(selectedPage()).toHaveAccessibleName('Start')
    expect(window.location.search).toBe('?page=start')
    expect(window.history.length).toBe(entries + 1)
  })

  it('leaves the URL alone when the logo is tapped on the Start page already', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=start')
    const entries = window.history.length

    await user.click(within(screen.getByRole('banner')).getByRole('link', { name: 'renewvan' }))

    expect(selectedPage()).toHaveAccessibleName('Start')
    expect(window.history.length).toBe(entries)
  })

  it('shows every header control at phone width', async () => {
    await renderAt(PHONE_WIDTH)
    expect(screen.getByRole('link', { name: 'renewvan' })).toBeInTheDocument()
    expect(screen.getByTestId('clock')).toBeInTheDocument()
    expect(screen.getByTestId('uplink-status-button')).toBeInTheDocument()
    expect(screen.getByRole('separator')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^alerts/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to .* theme/i })).toBeInTheDocument()
    expect(screen.getByTestId('display-sleep-button')).toBeInTheDocument()
  })

  it('orders the header controls theme, alerts, sleep', async () => {
    await renderAt(KIOSK_WIDTH)
    const header = within(screen.getByRole('banner'))
    const order = [
      header.getByRole('button', { name: /switch to .* theme/i }),
      header.getByRole('button', { name: /^alerts/i }),
      header.getByTestId('display-sleep-button'),
    ]
    for (const [before, after] of [
      [order[0], order[1]],
      [order[1], order[2]],
    ]) {
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
  })

  it('opens the uplink popover from the header', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByTestId('uplink-status-button'))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('opens Settings › Connectivity › Cellular from the uplink popover CTA', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await openCellularFromUplink(user)
    expect(selectedPage()).toHaveAccessibleName('Settings')
    expectInCellular()
    expect(window.location.search).toBe('?page=settings&view=cellular')
  })

  it('opens the Settings tree from the rail and walks into a group and back', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))

    const pane = screen.getByTestId('pane-settings')
    expect(within(pane).getAllByRole('button')).toHaveLength(3)
    expect(within(pane).getByRole('button', { name: /^Nodes/ })).toHaveTextContent(
      'No nodes connected',
    )

    await user.click(within(pane).getByRole('button', { name: /^General/ }))
    expect(within(pane).getByRole('heading', { name: 'General' })).toBeVisible()
    await user.click(within(pane).getByRole('button', { name: 'Settings' }))
    expect(within(pane).getAllByRole('button')).toHaveLength(3)
  })

  it('publishes a Display change as a JSON payload on the hyphenated /set topic', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await receive('renewvan/kiosk/display/brightness', '70')
    await receive('renewvan/kiosk/display/auto-sleep-enabled', 'false')
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = screen.getByTestId('pane-settings')
    await user.click(within(pane).getByRole('button', { name: /^General/ }))
    await user.click(within(pane).getByRole('button', { name: /^Display/ }))
    expect(within(pane).getByText('70%')).toBeVisible()

    await user.click(within(pane).getByRole('switch', { name: 'Auto-sleep' }))
    expect(mqtt.publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/kiosk/display/auto-sleep-enabled/set',
      'true',
      { qos: 1, retain: false },
    )

    mqtt.publish.mockClear()
    act(() => within(pane).getByRole('slider', { name: 'Brightness' }).focus())
    await user.keyboard('{ArrowRight}')
    expect(mqtt.publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/kiosk/display/brightness/set',
      '71',
      { qos: 1, retain: false },
    )
  })
})

describe('App shell Settings view in the URL', () => {
  it('Back after the popover CTA returns to the previous page, not an intermediate ?page=settings', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Power' }))
    await openCellularFromUplink(user)
    expectInCellular()

    await goBack()
    await waitFor(() => expect(selectedPage()).toHaveAccessibleName('Power'))
    expect(window.location.search).toBe('?page=power')
    expect(screen.queryByTestId('pane-settings')).not.toBeInTheDocument()

    await goForward()
    await waitFor(() => expectInCellular())
    expect(window.location.search).toBe('?page=settings&view=cellular')
  })

  it.each([
    ['kiosk', KIOSK_WIDTH],
    ['phone', PHONE_WIDTH],
  ])('opens Cellular from the popover CTA on another page (%s)', async (_name, width) => {
    const user = userEvent.setup()
    await renderAt(width, '/?page=tanks')
    await openCellularFromUplink(user)
    expectInCellular()
    expect(window.location.search).toBe('?page=settings&view=cellular')
  })

  it('tapping the Settings rail entry from another page drops a stale view', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=power&view=cellular')
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(new URLSearchParams(window.location.search).has('view')).toBe(false)
    expect(window.location.search).toBe('?page=settings')
    expectTopList()
  })

  it('leaving Settings from Cellular and returning by the rail shows the top list', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=settings&view=cellular')
    await user.click(screen.getByRole('tab', { name: 'Power' }))
    expect(window.location.search).toBe('?page=power')
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(window.location.search).toBe('?page=settings')
    expectTopList()
  })

  it.each([
    ['kiosk', KIOSK_WIDTH],
    ['phone', PHONE_WIDTH],
  ])(
    're-tapping the selected Settings entry inside a view returns to the top list (%s)',
    async (_name, width) => {
      const user = userEvent.setup()
      await renderAt(width, '/?page=power')
      await user.click(screen.getByRole('tab', { name: 'Settings' }))
      const pane = screen.getByTestId('pane-settings')
      await user.click(within(pane).getByRole('button', { name: /^Connectivity/ }))
      await user.click(within(pane).getByRole('button', { name: /^Hub/ }))
      expect(window.location.search).toBe('?page=settings&view=hub')
      const before = window.history.length

      await user.click(screen.getByRole('tab', { name: 'Settings' }))

      expect(window.location.search).toBe('?page=settings')
      expect(window.history.length).toBe(before + 1)
      expectTopList()

      await goBack()
      expect(currentView()).toHaveAccessibleName('Hub')
    },
  )

  it('re-tapping the selected Settings entry on the top list adds no history entry', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=power')
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    expect(window.location.search).toBe('?page=settings')
    const before = window.history.length

    await user.click(screen.getByRole('tab', { name: 'Settings' }))

    expect(window.location.search).toBe('?page=settings')
    expect(window.history.length).toBe(before)
    expectTopList()
  })

  it('opens the view named by ?view= on load, and the top list for an unknown one', async () => {
    await renderAt(KIOSK_WIDTH, '/?page=settings&view=cellular')
    expectInCellular()

    cleanup()
    await renderAt(KIOSK_WIDTH, '/?page=settings&view=bogus')
    expect(selectedPage()).toHaveAccessibleName('Settings')
    expectTopList()
  })

  it('keeps the open view across a reload', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = screen.getByTestId('pane-settings')
    await user.click(within(pane).getByRole('button', { name: /^Connectivity/ }))
    await user.click(within(pane).getByRole('button', { name: /^Hub/ }))

    cleanup()
    await renderAt(KIOSK_WIDTH, `/${window.location.search}`)
    expect(currentView()).toHaveAccessibleName('Hub')
  })

  it('Back and Forward step through the views', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = screen.getByTestId('pane-settings')
    await user.click(within(pane).getByRole('button', { name: /^Connectivity/ }))
    expect(window.location.search).toBe('?page=settings&view=connectivity')
    await user.click(within(pane).getByRole('button', { name: /^Tailscale/ }))
    expect(window.location.search).toBe('?page=settings&view=tailscale')
    expect(currentView()).toHaveAccessibleName('Tailscale')

    await goBack()
    expect(currentView()).toHaveAccessibleName('Connectivity')
    await goBack()
    expectTopList()
    expect(window.location.search).toBe('?page=settings')

    await goForward()
    expect(currentView()).toHaveAccessibleName('Connectivity')
    await goForward()
    expect(currentView()).toHaveAccessibleName('Tailscale')
  })

  it('the nav bar Back button pushes an entry too, so browser Back returns to the deeper view', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=settings&view=cellular')
    const pane = screen.getByTestId('pane-settings')
    await user.click(within(pane).getByRole('button', { name: 'Connectivity' }))
    expect(currentView()).toHaveAccessibleName('Connectivity')
    expect(window.location.search).toBe('?page=settings&view=connectivity')

    await user.click(within(pane).getByRole('button', { name: 'Settings' }))
    expectTopList()
    expect(window.location.search).toBe('?page=settings')

    await goBack()
    expect(currentView()).toHaveAccessibleName('Connectivity')

    await goBack()
    expectInCellular()
  })

  it('the popover CTA while already inside Settings › General changes the view', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = screen.getByTestId('pane-settings')
    await user.click(within(pane).getByRole('button', { name: /^General/ }))
    expect(currentView()).toHaveAccessibleName('General')

    await openCellularFromUplink(user)
    expectInCellular()
    expect(window.location.search).toBe('?page=settings&view=cellular')

    await goBack()
    expect(currentView()).toHaveAccessibleName('General')
  })
})

describe('App shell navbar position', () => {
  async function chooseBottomInSettings(user: UserEvent) {
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = within(screen.getByTestId('pane-settings'))
    await user.click(pane.getByRole('button', { name: /^General/ }))
    await user.click(pane.getByRole('button', { name: /^Display/ }))
    await user.click(pane.getByRole('radio', { name: 'Bottom' }))
  }

  it('shows the full lockup in the header beside a closed left rail by default', async () => {
    await renderAt(KIOSK_WIDTH)
    expect(screen.getAllByRole('link', { name: 'renewvan' })).toHaveLength(1)
    expect(within(screen.getByRole('banner')).getByRole('link', { name: 'renewvan' })).toBeVisible()
    expect(screen.getByRole('complementary')).toContainElement(screen.getByRole('tablist'))
    expect(screen.queryByRole('button', { name: /sidebar/i })).not.toBeInTheDocument()
  })

  it('lays the rail out over the full height: it shares a root with the header, which clears it', async () => {
    await renderAt(KIOSK_WIDTH)
    const rail = screen.getByRole('complementary')
    const header = screen.getByRole('banner')
    // One container holds the rail and the header, so the rail is not confined below the header.
    expect(rail.parentElement).toBe(screen.getByRole('tabpanel').parentElement?.parentElement)
    expect(rail.parentElement).toContainElement(header)
    expect(rail).toHaveClass('inset-y-0')
    // The header pads itself by the inset the rail covers, which pushes the logo right.
    expect(header.className).toContain('pl-[calc(1rem+var(--navbar-inset-left))]')
    expect(rail.parentElement?.style.getPropertyValue('--navbar-inset-left')).toBe('56px')
  })

  it('gives the logo its space back when the rail slides away', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      await renderAt(KIOSK_WIDTH)
      const root = screen.getByRole('complementary').parentElement as HTMLElement
      expect(root.style.getPropertyValue('--navbar-inset-left')).toBe('56px')
      await act(async () => {
        vi.advanceTimersByTime(4100)
      })
      expect(root.style.getPropertyValue('--navbar-inset-left')).toBe('0px')
    } finally {
      vi.useRealTimers()
    }
  })

  it('moves to a bottom bar as soon as Settings says so, and remembers it after a reload', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await chooseBottomInSettings(user)

    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toContainElement(
      screen.getByRole('tablist'),
    )
    expect(screen.getAllByRole('tab').map((tab) => tab.getAttribute('aria-label'))).toEqual(
      NAV_LABELS,
    )
    expect(window.localStorage.getItem(POSITION_KEY)).toBe('bottom')
    // The remount that swaps the layouts must not lose where the user is.
    expect(selectedPage()).toHaveAccessibleName('Settings')
    expect(currentView()).toHaveAccessibleName('Display & Appearance')
    expect(window.location.search).toBe('?page=settings&view=display')

    cleanup()
    await renderAt(KIOSK_WIDTH)
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toBeInTheDocument()
  })

  it('lists the stored position in Display, and a phone always reads Bottom without overwriting it', async () => {
    window.localStorage.setItem(POSITION_KEY, 'left')
    const user = userEvent.setup()
    await renderAt(PHONE_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = within(screen.getByTestId('pane-settings'))
    await user.click(pane.getByRole('button', { name: /^General/ }))
    await user.click(pane.getByRole('button', { name: /^Display/ }))

    expect(pane.getByRole('radio', { name: 'Bottom' })).toBeChecked()
    expect(pane.getByRole('radio', { name: 'Left' })).toBeDisabled()
    expect(window.localStorage.getItem(POSITION_KEY)).toBe('left')
  })

  it.each([
    { position: 'bottom', landmark: 'navigation' as const },
    { position: 'left', landmark: 'complementary' as const },
  ])(
    'hides the $position navbar after idle, reveals it on a touch anywhere, and stays up when pinned',
    async ({ position, landmark }) => {
      window.localStorage.setItem(POSITION_KEY, position)
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        await renderAt(KIOSK_WIDTH)
        const navbar = () => screen.getByRole(landmark, { hidden: true })
        const pane = () => screen.getByTestId('pane-start')
        // The navbar overlays the pages and never pushes them. The `Tabs` root publishes how much
        // of the pages' edge it covers right now (0 when it is away) for a page to pad itself by.
        const covered = position === 'bottom' ? '--navbar-inset-bottom' : '--navbar-inset-left'
        const other = position === 'bottom' ? '--navbar-inset-left' : '--navbar-inset-bottom'
        const insets = () =>
          screen.getByRole(landmark, { hidden: true }).parentElement as HTMLElement
        const inset = (name: string) => insets().style.getPropertyValue(name)
        expect(inset(covered)).not.toBe('0px')
        expect(inset(other)).toBe('0px')
        expect(navbar()).toHaveAttribute('data-state', 'visible')
        expect(
          screen.queryByRole('button', { name: /menu|show navigation/i }),
        ).not.toBeInTheDocument()

        await act(async () => {
          vi.advanceTimersByTime(4100)
        })
        expect(navbar()).toHaveAttribute('data-state', 'hidden')
        // The pages take the space back.
        expect(inset(covered)).toBe('0px')

        // A pointer merely drifting over the page does not pop it open...
        await user.hover(pane())
        expect(navbar()).toHaveAttribute('data-state', 'hidden')

        // ...but a touch anywhere on the screen does, and the pages make room again.
        await user.pointer({ keys: '[MouseLeft]', target: pane() })
        expect(navbar()).toHaveAttribute('data-state', 'visible')
        expect(inset(covered)).not.toBe('0px')
        await act(async () => {
          vi.advanceTimersByTime(4100)
        })
        expect(navbar()).toHaveAttribute('data-state', 'hidden')

        await user.pointer({ keys: '[MouseLeft]', target: pane() })
        expect(navbar()).toHaveAttribute('data-state', 'visible')

        // While auto-hiding, the page and header glide as the navbar slides.
        const header = screen.getByRole('banner')
        expect(screen.getByRole('tabpanel')).toHaveClass('transition-[padding]')
        expect(header).toHaveClass('transition-[padding]')

        // Pinning disarms the timer the pin tap itself armed. The navbar stays up, the page
        // keeps the room it made for it, and nothing animates any more.
        await user.click(screen.getByRole('button', { name: 'Pin navigation bar' }))
        await act(async () => {
          vi.advanceTimersByTime(10_000)
        })
        expect(navbar()).toHaveAttribute('data-state', 'visible')
        expect(inset(covered)).not.toBe('0px')
        expect(screen.getByRole('tabpanel')).not.toHaveClass('transition-[padding]')
        expect(header).not.toHaveClass('transition-[padding]')

        // Turning auto-hide back on starts from a visible navbar and restores the motion, then
        // hides it after idle.
        await user.click(screen.getByRole('button', { name: 'Auto-hide navigation bar' }))
        expect(navbar()).toHaveAttribute('data-state', 'visible')
        expect(screen.getByRole('tabpanel')).toHaveClass('transition-[padding]')
        await act(async () => {
          vi.advanceTimersByTime(4100)
        })
        expect(navbar()).toHaveAttribute('data-state', 'hidden')
      } finally {
        vi.useRealTimers()
      }
    },
  )
})

describe('App shell pinned navbar', () => {
  it.each([
    { position: 'left', landmark: 'complementary' as const, inset: '--navbar-inset-left' },
    { position: 'bottom', landmark: 'navigation' as const, inset: '--navbar-inset-bottom' },
  ])(
    'pinned straight after load, the $position navbar and the page stay put for good',
    async ({ position, landmark, inset }) => {
      window.localStorage.setItem(POSITION_KEY, position)
      vi.useFakeTimers({ shouldAdvanceTime: true })
      try {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        await renderAt(KIOSK_WIDTH)
        const navbar = screen.getByRole(landmark, { hidden: true })
        const root = navbar.parentElement as HTMLElement
        const room = root.style.getPropertyValue(inset)
        expect(room).not.toBe('0px')

        // No hide/reveal first: the idle timer the load armed must not outlive the pin.
        await user.click(screen.getByRole('button', { name: 'Pin navigation bar' }))
        await act(async () => {
          vi.advanceTimersByTime(30_000)
        })

        expect(navbar).toHaveAttribute('data-state', 'visible')
        expect(root.style.getPropertyValue(inset)).toBe(room)
        expect(screen.getByRole('tabpanel')).not.toHaveClass('transition-[padding]')
      } finally {
        vi.useRealTimers()
      }
    },
  )
})

describe('App shell header height', () => {
  it('publishes the header height for the toast region and keeps it current', async () => {
    await renderAt(KIOSK_WIDTH)
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR)).toBe('49px')

    headerHeight = 53
    act(() => resizeCallbacks.forEach((callback) => callback()))
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR)).toBe('53px')
  })

  it('stops publishing when the app unmounts', async () => {
    await renderAt(KIOSK_WIDTH)
    cleanup()
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VAR)).toBe('')
  })
})

describe('App Alerts toggle', () => {
  const SWITCH_NAME = 'Show alert notifications'
  let danger: MockInstance<typeof toast.danger>
  let close: MockInstance<typeof toast.close>

  beforeEach(() => {
    danger = vi.spyOn(toast, 'danger').mockReturnValue('alarm-toast')
    close = vi.spyOn(toast, 'close').mockImplementation(() => {})
  })

  async function openAlerts() {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))
    const pane = within(screen.getByTestId('pane-settings'))
    await user.click(pane.getByRole('button', { name: /^General/ }))
    await user.click(pane.getByRole('button', { name: /^AlertsNotifications/ }))
    return user
  }

  it('mutes a live toast when switched off and shows it again when switched on', async () => {
    const user = await openAlerts()
    await receiveAlarmingTank()
    expect(danger).toHaveBeenCalledTimes(1)
    expect(close).not.toHaveBeenCalled()

    await user.click(screen.getByRole('switch', { name: SWITCH_NAME }))
    expect(close).toHaveBeenCalledExactlyOnceWith('alarm-toast')
    expect(window.localStorage.getItem('renewvan-dashboard-alerts-enabled')).toBe('false')

    await user.click(screen.getByRole('switch', { name: SWITCH_NAME }))
    expect(danger).toHaveBeenCalledTimes(2)
  })

  it('shows no toast for an alarm that arrives while muted, then shows it when switched on', async () => {
    window.localStorage.setItem('renewvan-dashboard-alerts-enabled', 'false')
    const user = await openAlerts()
    expect(screen.getByRole('switch', { name: SWITCH_NAME })).not.toBeChecked()

    await receiveAlarmingTank()
    expect(danger).not.toHaveBeenCalled()

    await user.click(screen.getByRole('switch', { name: SWITCH_NAME }))
    expect(danger).toHaveBeenCalledTimes(1)
  })

  it('keeps the Alerts row in General in step with the switch', async () => {
    const user = await openAlerts()

    await user.click(screen.getByRole('switch', { name: SWITCH_NAME }))
    await user.click(screen.getByRole('button', { name: 'General' }))

    expect(
      within(screen.getByTestId('pane-settings')).getByRole('button', {
        name: /^AlertsNotifications/,
      }),
    ).toHaveTextContent('Notifications off')
  })
})

describe('App shell Relays page', () => {
  const RELAY_INFO = {
    node: 'esp32-relay',
    product: 'ESP32 16-channel relay board',
    source: 'ESP32 with two chained SN74HC595 shift registers',
    publishes: ['relay'],
    version: 'v0.1.0',
  }

  /** What the relay Node leaves on the bus: its info and health, then a named relay and its state. */
  async function receiveRelayNode(health: 'online' | 'offline') {
    await receive('renewvan/esp32-relay/info', JSON.stringify(RELAY_INFO))
    await receive('renewvan/esp32-relay/health', health)
    await receive('renewvan/relay/relay_01/name', '"Ceiling lights"')
    await receive('renewvan/relay/relay_01/state', 'false')
  }

  const lights = (word: 'Off' | 'On') =>
    within(screen.getByRole('radiogroup', { name: 'Ceiling lights' })).getByRole('radio', {
      name: word,
    })

  it('is named Relays, and shows a relay the bus reports', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH)
    await receiveRelayNode('online')

    await user.click(screen.getByRole('tab', { name: 'Relays' }))

    expect(lights('Off')).toBeChecked()
  })

  it('publishes the target state as JSON on the relay set topic when a segment is tapped', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=switches')
    await receiveRelayNode('online')

    await user.click(lights('On'))

    expect(mqtt.publish).toHaveBeenCalledExactlyOnceWith('renewvan/relay/relay_01/set', 'true', {
      qos: 1,
      retain: false,
    })
  })

  it('settles the control when the relay reports the new state', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=switches')
    await receiveRelayNode('online')
    await user.click(lights('On'))

    await receive('renewvan/relay/relay_01/state', 'true')

    expect(lights('On')).toBeChecked()
    expect(lights('On')).toBeEnabled()
  })

  it('reads Unknown and publishes nothing while the relay Node is offline', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=switches')
    await receiveRelayNode('offline')

    expect(lights('On')).toBeDisabled()
    expect(lights('Off')).not.toBeChecked()
    expect(lights('On')).not.toBeChecked()
    await user.click(lights('On'))
    expect(mqtt.publish).not.toHaveBeenCalled()
  })

  it('treats a relay Node with info but no health as not online', async () => {
    await renderAt(KIOSK_WIDTH, '/?page=switches')
    await receive('renewvan/esp32-relay/info', JSON.stringify(RELAY_INFO))
    await receive('renewvan/relay/relay_01/name', '"Ceiling lights"')
    await receive('renewvan/relay/relay_01/state', 'false')

    expect(lights('On')).toBeDisabled()
  })

  it('never publishes a relay command in Demo mode, though the demo relays share the real ids', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=switches')
    await receive('renewvan/demo/enabled', 'true')
    await receive('renewvan/demo/esp32-relay/info', JSON.stringify(RELAY_INFO))
    await receive('renewvan/demo/esp32-relay/health', 'online')
    await receive('renewvan/demo/relay/relay_01/name', '"Ceiling lights"')
    await receive('renewvan/demo/relay/relay_01/state', 'true')

    expect(lights('On')).toBeDisabled()
    expect(lights('Off')).toBeDisabled()
    expect(screen.getByText(/Demo mode: controls are disabled/)).toBeInTheDocument()
    await user.click(lights('Off'))
    expect(mqtt.publish).not.toHaveBeenCalled()
  })

  it('renames a relay from Settings, publishing a JSON string to name/set', async () => {
    const user = userEvent.setup()
    await renderAt(KIOSK_WIDTH, '/?page=settings')
    await receiveRelayNode('online')

    await user.click(screen.getByRole('button', { name: /^Nodes/ }))
    await user.click(screen.getByRole('button', { name: /^Relays/ }))
    await user.click(
      within(screen.getByRole('list', { name: 'Entities' })).getByRole('button', {
        name: /^Relays/,
      }),
    )
    const field = within(screen.getByRole('group', { name: 'relay_01' })).getByRole('textbox', {
      name: 'Name',
    })
    await user.clear(field)
    await user.type(field, 'Galley light{Enter}')

    expect(mqtt.publish).toHaveBeenCalledExactlyOnceWith(
      'renewvan/relay/relay_01/name/set',
      '"Galley light"',
      { qos: 1, retain: false },
    )
  })
})
