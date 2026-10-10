import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { onTestFinished, vi } from 'vitest'
import { SettingsProvider } from '@/components/settings/SettingsProvider'
import type { SettingsContextValue } from '@/components/settings/SettingsContext'
import { SettingsTab } from '@/components/settings/SettingsTab'
import type { TailscaleStatus } from '@/hooks/useRenewvanBus'
import type { Router } from '@/types'
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

interface RenderSettingsOptions {
  /** Simulated viewport width for `matchMedia` (default: kiosk). */
  width?: number
}

/**
 * Renders the Settings tab inside a `SettingsProvider` holding a literal
 * value: the defaults below with `overrides` on top. Stubs `matchMedia` and
 * `ResizeObserver` (jsdom has neither) and restores them when the test finishes.
 * Later tickets add their fields to `defaultValue` only.
 */
export function renderSettings(
  overrides: Partial<SettingsContextValue> = {},
  { width = KIOSK_WIDTH }: RenderSettingsOptions = {},
) {
  const viewport = stubMatchMedia(width)
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
  onTestFinished(() => {
    viewport.restore()
    vi.unstubAllGlobals()
  })

  const value: SettingsContextValue = {
    nodes: [],
    temperatures: {},
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
    ...overrides,
  }

  const user = userEvent.setup()
  const result = render(
    <SettingsProvider value={value}>
      <SettingsTab />
    </SettingsProvider>,
  )
  return { user, viewport, value, ...result }
}
