import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onTestFinished, vi } from 'vite-plus/test'
import { SettingsProvider } from '@/components/settings/SettingsProvider'
import type { SettingsContextValue } from '@/components/settings/SettingsContext'
import { SettingsPage } from '@/components/settings/SettingsPage'
import type { TailscaleStatus } from '@/hooks/useRenewvanBus'
import { DEFAULT_START_POWER_SOURCES } from '@/hooks/useStartPowerSources'
import { nodeRows } from '@/lib/nodes'
import { emptyRenewvanBusState, type RenewvanBusState, type Router } from '@/types'
import { stubMatchMedia } from './matchMedia'

export const connectedTailscale: TailscaleStatus = {
  enabled: true,
  connected: true,
  ip: '100.64.0.1',
  hostname: 'renewvan',
  peers: 1,
}

export const liveRouter: Router = {
  signal_rsrp_dbm: -85,
  signal_rsrq_db: -10,
  signal_sinr_db: 6,
  signal_rssi_dbm: -54,
  operator: '26203',
  network_type: 'lte',
  uptime_s: 826_671,
  data_used_month_tx_b: 140.2 * 1024 * 1024,
  data_used_month_rx_b: 385.1 * 1024 * 1024,
}

/** jsdom has no `ResizeObserver`, which HeroUI's `ScrollShadow` observes. */
class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

/** Kiosk width: comfortably above the 800px "mobile" breakpoint. */
const KIOSK_WIDTH = 1024

export interface RenderSettingsOptions {
  /** Simulated viewport width for `matchMedia` (default: kiosk). */
  width?: number
  /** Starting URL, to open on a deep link (default: the Settings top list). */
  url?: string
  /**
   * What is on the bus. The Nodes list is derived from it through the real `nodeRows`, so a test
   * describes topics and not rows; its `tanks` and `temperatures` also feed the context unless
   * `overrides` set them.
   */
  bus?: Partial<RenewvanBusState>
}

/**
 * Renders the Settings page inside a `SettingsProvider` holding a literal
 * value: the defaults below with `overrides` on top. Stubs `matchMedia` and
 * `ResizeObserver` (jsdom has neither) and restores them, and the URL, when the test finishes.
 * Later tickets add their fields to `defaultValue` only.
 */
export function renderSettings(
  overrides: Partial<SettingsContextValue> = {},
  { width = KIOSK_WIDTH, url = '/?page=settings', bus }: RenderSettingsOptions = {},
) {
  const state: RenewvanBusState = { ...emptyRenewvanBusState, ...bus }
  // The open view lives in `?view=`: every render starts at the top list unless a `url` is given.
  window.history.replaceState(null, '', url)
  const viewport = stubMatchMedia(width)
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
  onTestFinished(() => {
    window.history.replaceState(null, '', '/')
    viewport.restore()
    vi.unstubAllGlobals()
  })

  const value: SettingsContextValue = {
    nodes: nodeRows(state),
    temperatures: state.temperatures,
    tanks: state.tanks,
    relays: state.relays,
    router: liveRouter,
    routerHealth: 'online',
    routerUpdatedAt: Date.now(),
    busStatus: 'connected',
    tailscale: connectedTailscale,
    brightness: 70,
    autoSleepEnabled: false,
    autoSleepTimeoutMinutes: 5,
    setBrightness: vi.fn(),
    setAutoSleepEnabled: vi.fn(),
    setAutoSleepTimeoutMinutes: vi.fn(),
    alertsEnabled: true,
    setAlertsEnabled: vi.fn(),
    demoMode: false,
    setDemoMode: vi.fn(),
    theme: 'dark',
    setTheme: vi.fn(),
    navbarPosition: 'left',
    setNavbarPosition: vi.fn(),
    startPowerSources: DEFAULT_START_POWER_SOURCES,
    setStartPowerSources: vi.fn(),
    powerLayout: 'tiles',
    setPowerLayout: vi.fn(),
    setTemperatureName: vi.fn(),
    setTemperatureUnit: vi.fn(),
    setRelay: vi.fn(),
    setRelayName: vi.fn(),
    ...overrides,
  }

  const user = userEvent.setup()
  const result = render(
    <SettingsProvider value={value}>
      <SettingsPage />
    </SettingsProvider>,
  )
  return { user, viewport, value, ...result }
}

/**
 * The rows of the open Settings view: the pane's buttons except the navigation bar's Back
 * button, which is not a row.
 */
export function settingsRows(): HTMLElement[] {
  const pane = screen.getByTestId('pane-settings')
  const nav = within(pane).queryByRole('navigation', { name: 'Settings navigation' })
  return within(pane)
    .getAllByRole('button')
    .filter((button) => !nav?.contains(button))
}
