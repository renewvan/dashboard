import {
  Armchair,
  Bed,
  Car,
  Cpu,
  Droplet,
  Fan,
  Flame,
  House,
  Park,
  Refrigerator,
  Snowflake,
  Sun,
  Thermometer,
  Trees,
  Truck,
  Warehouse,
  Wind,
  type LucideIcon,
} from 'lucide-react'

/**
 * The icons a temperature probe can ask for: its `icon` is the lucide component name as a string
 * (`Refrigerator`). A curated list rather than lucide's whole set, which would put every icon in the
 * bundle; a name outside it reads as no choice, so the dashboard picks one from the probe itself.
 */
export const TEMPERATURE_ICONS: Record<string, LucideIcon> = {
  Park,
  Trees,
  Armchair,
  Cpu,
  Thermometer,
  Refrigerator,
  Snowflake,
  Sun,
  Flame,
  House,
  Car,
  Truck,
  Droplet,
  Wind,
  Warehouse,
  Bed,
  Fan,
}

export const TEMPERATURE_ICON_NAMES = Object.keys(TEMPERATURE_ICONS)

/** The icon for a probe's `icon` string, or `undefined` when it has none the dashboard knows. */
export function temperatureIcon(name: string | undefined): LucideIcon | undefined {
  return name === undefined ? undefined : TEMPERATURE_ICONS[name]
}
