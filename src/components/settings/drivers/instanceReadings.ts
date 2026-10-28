import type { SolarChargeState } from '@/types'

/** A controller's charge stage as a label: `external_control` reads `External control`. */
export function chargeStateLabel(state: SolarChargeState): string {
  const words = state.replace('_', ' ')
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export const measured = (
  value: number | undefined,
  format: (n: number) => string,
): string | null => (value === undefined ? null : format(value))

export const watts = (n: number) => `${Math.round(n)} W`
export const volts = (n: number) => `${n.toFixed(2)} V`
export const amps = (n: number) => `${n.toFixed(1)} A`
