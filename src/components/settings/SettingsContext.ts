import { createContext, useContext } from 'react'
import type {
  AutoSleepTimeoutMinutes,
  ConnectionStatus,
  DisplayPower,
  RouterHealth,
  HubStatus,
  TailscaleStatus,
} from '@/hooks/useRenewvanBus'
import type { NavbarPosition } from '@/hooks/useNavbarPosition'
import type { Theme } from '@/hooks/useTheme'
import type { BrokerLink } from '@/lib/brokerLink'
import type { HubAddress } from '@/lib/hubAddress'
import type { StartPowerSources } from '@/hooks/useStartPowerSources'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import type { DeviceRow } from '@/lib/devices'
import type { Relay, Router, Tank, TemperatureSensor, TemperatureUnit } from '@/types'

/**
 * Everything the Settings page and its views read, built once by `App` from
 * its single hook instances. `tanks`, `temperatures` and `router` are `Partial` because
 * the bus accumulates entities one property per retained message.
 */
export interface SettingsContextValue {
  /** One row per Device, then one fallback row per entity type no Device claims (`deviceRows`). */
  devices: DeviceRow[]
  tanks: Record<string, Partial<Tank>>
  temperatures: Record<string, Partial<TemperatureSensor>>
  relays: Record<string, Relay>
  router: Partial<Router> | undefined
  routerHealth: RouterHealth | null
  routerUpdatedAt: number | undefined
  busStatus: ConnectionStatus
  tailscale: TailscaleStatus | null
  /** The hub as the Hub connection block shows it (`hubAddress`); null while nothing is known. */
  hub: HubAddress | null
  /** The Pi's own status (`renewvan/hub/status`): its address and hostname; null until it arrives. */
  hubStatus: HubStatus | null
  /** The kiosk's connection to the broker, display-safe (`brokerLink`); null with no broker URL. */
  broker: BrokerLink | null
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
  /** The kiosk display's power, `null` until the retained topic arrives; drives the nav bar's sleep button. */
  displayPower: DisplayPower
  sleepDisplay: () => void
  wakeDisplay: () => void
  /** Unseen-alert count and the jump to the Alerts page: the header bell, repeated in a subpage's nav bar. */
  unseenAlertCount: number
  openAlerts: () => void
  setBrightness: (value: number) => void
  setAutoSleepEnabled: (value: boolean) => void
  setAutoSleepTimeoutMinutes: (value: AutoSleepTimeoutMinutes) => void
  /** The Alerts toggle: the same instance `useAlertToasts` reads. */
  alertsEnabled: boolean
  setAlertsEnabled: (enabled: boolean) => void
  /** The Demo mode toggle: the same instance `useRenewvanBus` reads its topic root from. */
  demoMode: boolean
  setDemoMode: (demo: boolean) => void
  /** The colour theme: the same instance `App` applies to `<html>` and the header toggle drives. */
  theme: Theme
  setTheme: (theme: Theme) => void
  /** The Navbar position: the same instance `App` lays the shell out from. */
  navbarPosition: NavbarPosition
  setNavbarPosition: (position: NavbarPosition) => void
  /** The Start page's half-moon sources and scales: the same instance the Start page reads. */
  startPowerSources: StartPowerSources
  setStartPowerSources: (sources: StartPowerSources) => void
  /** How the Power page is drawn, Tiles or Orbs: the same instance the Power page reads. */
  powerLayout: PowerLayout
  setPowerLayout: (layout: PowerLayout) => void
  setTemperatureName: (id: string, name: string) => void
  setTemperatureUnit: (id: string, unit: TemperatureUnit) => void
  setRelay: (id: string, on: boolean) => void
  setRelayName: (id: string, name: string) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (value === null) throw new Error('useSettings must be used inside a SettingsProvider')
  return value
}
