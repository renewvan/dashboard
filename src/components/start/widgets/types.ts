import type {
  Battery as BatteryRecord,
  Charger,
  Gps,
  Solar,
  Tank,
  TemperatureSensor,
  Tilt,
} from '@/types'
import type { PowerLayout } from '@/hooks/usePowerLayout'

/**
 * What every phone Start-page widget is handed: the bus state and the display choices. A widget
 * picks what it needs and draws itself (including its own empty state), so the page does not know
 * what any widget shows.
 */
export interface StartWidgetProps {
  tanks: Record<string, Partial<Tank>>
  batteries: Record<string, Partial<BatteryRecord>>
  /** The shared Primary battery choice, `auto` or an instance id (`primaryBattery`). */
  primaryBatterySelection?: string
  solar: Record<string, Partial<Solar>>
  chargers: Record<string, Partial<Charger>>
  temperatures: Record<string, Partial<TemperatureSensor>>
  gps: Record<string, Partial<Gps>>
  tilt: Record<string, Partial<Tilt>>
  /** The Power page's layout choice; the Energy widget draws the same one. */
  powerLayout: PowerLayout
  /** Glow behind the dial fill: dark theme only. */
  isDark: boolean
  /** Whether the map widget draws the dark map: the Map page's choice, which can differ from the app theme. */
  mapIsDark: boolean
  /** The van marker's colour on the map widget; empty is the theme accent. */
  vanColor?: string
  /** The current time, refreshed slowly; tank severity reads it. */
  now: Date
  /** A tank widget's Configure button: opens that tank's settings. */
  onConfigureTank: (id: string) => void
  /** A power-flow source: opens its device in Settings, by its `instanceKey`. */
  onOpenInstance?: (key: string) => void
}
