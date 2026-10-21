import type { DeviceTone } from '@/lib/devices'

/** The status dot's colour, by how a Device reads: green, grey (offline or unknown health), amber. */
export const DEVICE_TONE: Record<DeviceTone, string> = {
  ok: 'bg-success',
  offline: 'bg-muted',
  unknown: 'bg-warning',
}
