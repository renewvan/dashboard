import type { ComponentType } from 'react'
import { CloudSun, Droplet, Droplets, Map as MapIcon, Move3d, Sun, Zap } from 'lucide-react'
import type { StartWidgetId } from '@/hooks/useStartLayout'
import { EnergyCard } from './EnergyCard'
import { FreshWaterCard, GreyWaterCard } from './FluidTankCard'
import { MapCard } from './MapCard'
import { SolarYieldCard } from './SolarYieldCard'
import { TiltCard } from './TiltCard'
import { WeatherCard } from './WeatherCard'
import type { StartWidgetProps } from './types'

export interface StartWidgetDefinition {
  id: StartWidgetId
  /** What the widget is called where the user picks, adds or removes it. */
  label: string
  icon: ComponentType<{ className?: string }>
  Component: ComponentType<StartWidgetProps>
}

/**
 * Every widget the phone Start page can show, by id. A widget is added here and in
 * `START_WIDGET_IDS`; the page and any editor read both and know nothing else about it.
 */
export const START_WIDGETS: Record<StartWidgetId, StartWidgetDefinition> = {
  weather: { id: 'weather', label: 'Weather', icon: CloudSun, Component: WeatherCard },
  map: { id: 'map', label: 'Map', icon: MapIcon, Component: MapCard },
  energy: { id: 'energy', label: 'Energy', icon: Zap, Component: EnergyCard },
  solar: { id: 'solar', label: 'Solar', icon: Sun, Component: SolarYieldCard },
  tilt: { id: 'tilt', label: 'Tilt', icon: Move3d, Component: TiltCard },
  'fresh-water': {
    id: 'fresh-water',
    label: 'Fresh water',
    icon: Droplet,
    Component: FreshWaterCard,
  },
  'grey-water': {
    id: 'grey-water',
    label: 'Grey water',
    icon: Droplets,
    Component: GreyWaterCard,
  },
}
