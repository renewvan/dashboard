import type { Tank } from '@/types'

export const FLUID_LABELS: Record<Tank['fluid_type'], string> = {
  fresh_water: 'Fresh water',
  grey_water: 'Grey water',
  black_water: 'Black water',
  fuel: 'Fuel',
  lpg: 'LPG',
}

export const STATUS_LABELS: Record<Tank['status'], string> = {
  ok: 'Connected',
  open_circuit: 'Open circuit',
  short_circuit: 'Short circuit',
}
