import type { Tank } from '../types'

export const FLUID_LABELS: Record<Tank['fluid_type'], string> = {
  fresh_water: 'Fresh water',
  grey_water: 'Grey water',
  black_water: 'Black water',
  fuel: 'Fuel',
  lpg: 'LPG',
}

/** Normal-band liquid-fill color per fluid type -- lets a camper tell
 *  tanks apart by color at a glance (fresh water reads as the brand
 *  blue; everything else gets its own distinct hue), independent of
 *  alarm severity. Caution/danger always override this with amber/red
 *  (see `tankLiquidColor`) so an alarm is never mistaken for "this
 *  fluid's normal color". */
export const FLUID_COLORS: Record<Tank['fluid_type'], string> = {
  fresh_water: 'var(--accent)',
  grey_water: 'var(--accent)',
  black_water: 'var(--color-stone-800)',
  fuel: 'var(--color-amber-600)',
  lpg: 'var(--color-orange-500)',
}

export const STATUS_LABELS: Record<Tank['status'], string> = {
  ok: 'Connected',
  open_circuit: 'Open circuit',
  short_circuit: 'Short circuit',
}
