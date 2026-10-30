import {
  Armchair,
  Bath,
  Bed,
  Car,
  Container,
  Cpu,
  Droplet,
  Fan,
  Flame,
  Fuel,
  GlassWater,
  House,
  Park,
  Refrigerator,
  ShowerHead,
  Snowflake,
  Sun,
  Thermometer,
  Toilet,
  Trees,
  Truck,
  Warehouse,
  Waves,
  Wind,
  type LucideIcon,
} from 'lucide-react'

/**
 * The icons an entity can ask for: its `icon` is the lucide component name as a string
 * (`Refrigerator`). A curated list rather than lucide's whole set, which would put every icon in the
 * bundle; a name outside it reads as no choice, so the dashboard picks one from the entity itself.
 */
const ENTITY_ICONS: Record<string, LucideIcon> = {
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
  Waves,
  Toilet,
  Fuel,
  ShowerHead,
  Bath,
  GlassWater,
  Container,
}

/** What the Settings picker offers a temperature probe, and a tank. */
export const TEMPERATURE_ICON_NAMES = [
  'Park',
  'Trees',
  'Armchair',
  'Cpu',
  'Thermometer',
  'Refrigerator',
  'Snowflake',
  'Sun',
  'Flame',
  'House',
  'Car',
  'Truck',
  'Droplet',
  'Wind',
  'Warehouse',
  'Bed',
  'Fan',
]

export const TANK_ICON_NAMES = [
  'Droplet',
  'Waves',
  'Toilet',
  'Fuel',
  'Flame',
  'ShowerHead',
  'Bath',
  'GlassWater',
  'Container',
]

/** The entities whose icon a client can pick. */
export type IconEntity = 'tank' | 'temperature'

/** The key of an instance in the shared icons map (`renewvan/hub/icons`): `<entity>/<id>`. */
export function iconKey(entity: IconEntity, id: string): string {
  return `${entity}/${id}`
}

/** The icon for an entity's `icon` string, or `undefined` when it has none the dashboard knows. */
export function entityIcon(name: string | undefined): LucideIcon | undefined {
  return name === undefined ? undefined : ENTITY_ICONS[name]
}

export function entityIconOf(name: string): LucideIcon {
  return ENTITY_ICONS[name]
}
