import { createElement } from 'react'
import { useEntityIcon } from '@/hooks/useEntityIcon'
import { entityIcon } from '@/lib/entityIcons'
import type { Tank } from '@/types'
import { FLUID_ICONS } from './fluidIcon'

/** The icon picked for the tank in Settings (`renewvan/hub/icons`), else its fluid's own. */
export function TankIcon({
  id,
  tank,
  className,
}: {
  /** The tank's bus id: the key its icon is stored under. */
  id: string
  tank: Pick<Tank, 'fluid_type'>
  className?: string
}) {
  const picked = entityIcon(useEntityIcon('tank', id))
  return createElement(picked ?? FLUID_ICONS[tank.fluid_type], { 'aria-hidden': true, className })
}
