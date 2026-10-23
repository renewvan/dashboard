import type { DriverTone } from '@/lib/drivers'

/** The status dot's colour, by how a Driver reads: green, grey (offline or unknown health), amber. */
export const DRIVER_TONE: Record<DriverTone, string> = {
  ok: 'bg-success',
  offline: 'bg-muted',
  unknown: 'bg-warning',
}
