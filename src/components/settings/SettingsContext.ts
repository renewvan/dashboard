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
import type { IconEntity } from '@/lib/entityIcons'
import type { HubAddress } from '@/lib/hubAddress'
import type { StartPowerSources } from '@/hooks/useStartPowerSources'
import type { PowerLayout } from '@/hooks/usePowerLayout'
import type { StartWidgetId } from '@/hooks/useStartLayout'
import type { StartTiles } from '@/hooks/useStartTiles'
import type { StartView } from '@/hooks/useStartView'
import type { MapThemeChoice } from '@/hooks/useMapTheme'
import type { Van } from '@/hooks/useVan'
import type { DriverRow } from '@/lib/drivers'
import type {
  Battery,
  Charger,
  Gps,
  Relay,
  Router,
  Solar,
  Tank,
  TemperatureSensor,
  TemperatureUnit,
} from '@/types'

/**
 * What the bus reports, and the shell derives from it, built by `App` from its single hook
 * instances; it changes with the messages. `tanks`, `temperatures`, `gps` and `router` are `Partial`
 * because the bus accumulates entities one property per retained message.
 */
export interface SettingsData {
  /** One row per Driver, then one fallback row per entity type no Driver claims (`driverRows`). */
  drivers: DriverRow[]
  tanks: Record<string, Partial<Tank>>
  temperatures: Record<string, Partial<TemperatureSensor>>
  gps: Record<string, Partial<Gps>>
  relays: Record<string, Relay>
  /** Every instance on the bus, for the instances views; `Partial` for the same reason as `tanks`. */
  batteries: Record<string, Partial<Battery>>
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  /** The shared Primary battery choice (`renewvan/hub/primary-battery`): `auto` or a battery instance id. */
  primaryBatterySelection: string
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
  /** The kiosk display's power, `null` until the retained topic arrives; drives the nav bar's sleep button. */
  displayPower: DisplayPower
  /** Unseen-alert count and the jump to the Alerts page: the header bell, repeated in a subpage's nav bar. */
  unseenAlertCount: number
}

/** The values the user chose and the kiosk stores; they change only when someone changes them. */
export interface SettingsPreferences {
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
  /** The Alerts toggle: the same instance `useAlertToasts` reads. */
  alertsEnabled: boolean
  /** The Demo mode toggle: the same instance `useRenewvanBus` reads its topic root from. */
  demoMode: boolean
  /** The colour theme: the same instance `App` applies to `<html>` and the header toggle drives. */
  theme: Theme
  /** The Navbar position: the same instance `App` lays the shell out from. */
  navbarPosition: NavbarPosition
  /** The Start page's half-moon sources and scales: the same instance the Start page reads. */
  startPowerSources: StartPowerSources
  /** The phone Start page's widgets, in order; one not listed is not shown. The same instance `App` reads. */
  startLayout: readonly StartWidgetId[]
  /** The kiosk's Start page, Cockpit or Grid (a phone always shows its widget stack): the same instance `App` reads. */
  startView: StartView
  /** The Grid's tile sizes, only those changed from the shipped ones: the same instance `App` reads. */
  startTiles: StartTiles
  /** How the Power page is drawn, Tiles or Orbs: the same instance the Power page reads. */
  powerLayout: PowerLayout
  /** The Map page's look: Auto (follow the app theme), Light or Dark; the same instance `App` reads. */
  mapTheme: MapThemeChoice
  /** The van's details (name, brand, model, kms, plate): kiosk-local, the same instance `App` reads. */
  van: Van
}

/** Every setter, command and handler. Stable, so they rarely re-render a reader. */
export interface SettingsActions {
  sleepDisplay: () => void
  wakeDisplay: () => void
  openAlerts: () => void
  setBrightness: (value: number) => void
  setAutoSleepEnabled: (value: boolean) => void
  setAutoSleepTimeoutMinutes: (value: AutoSleepTimeoutMinutes) => void
  setAlertsEnabled: (enabled: boolean) => void
  setDemoMode: (demo: boolean) => void
  setTheme: (theme: Theme) => void
  setNavbarPosition: (position: NavbarPosition) => void
  setStartPowerSources: (sources: StartPowerSources) => void
  setStartLayout: (layout: readonly StartWidgetId[]) => void
  setStartView: (view: StartView) => void
  setStartTiles: (tiles: StartTiles) => void
  setPowerLayout: (layout: PowerLayout) => void
  setMapTheme: (choice: MapThemeChoice) => void
  setVanField: (field: keyof Van, value: string) => void
  setTemperatureName: (id: string, name: string) => void
  setTemperatureUnit: (id: string, unit: TemperatureUnit) => void
  setEntityIcon: (entity: IconEntity, id: string, icon: string) => void
  setRelay: (id: string, on: boolean) => void
  setRelayName: (id: string, name: string) => void
  setPrimaryBattery: (value: string) => void
}

/** The three slices together: what a test builds as one literal. */
export type SettingsContextValue = SettingsData & SettingsPreferences & SettingsActions

export const SettingsDataContext = createContext<SettingsData | null>(null)
export const SettingsPreferencesContext = createContext<SettingsPreferences | null>(null)
export const SettingsActionsContext = createContext<SettingsActions | null>(null)

function useRequired<T>(value: T | null, hook: string): T {
  if (value === null) throw new Error(`${hook} must be used inside a SettingsProvider`)
  return value
}

/** What the bus reports: tanks, drivers, relays, the connection. Re-renders with the messages. */
export function useSettingsData(): SettingsData {
  return useRequired(useContext(SettingsDataContext), 'useSettingsData')
}

/** The stored choices (theme, navbar position, ...). Re-renders only when one changes. */
export function useSettingsPreferences(): SettingsPreferences {
  return useRequired(useContext(SettingsPreferencesContext), 'useSettingsPreferences')
}

/** The setters and commands. Re-renders its reader only if a handler's identity changes. */
export function useSettingsActions(): SettingsActions {
  return useRequired(useContext(SettingsActionsContext), 'useSettingsActions')
}
