import { Droplet, Flame, Fuel, Toilet, Waves, type LucideIcon } from 'lucide-react'
import type { Tank } from '@/types'

/**
 * The icon of each fluid. One map for the Tanks page's cards and the Start page's dials, so a fluid
 * wears the same icon on both and they cannot drift apart.
 */
export const FLUID_ICONS: Record<Tank['fluid_type'], LucideIcon> = {
  fresh_water: Droplet,
  grey_water: Waves,
  black_water: Toilet,
  fuel: Fuel,
  lpg: Flame,
}
