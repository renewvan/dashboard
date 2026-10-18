import type { NodeTone } from '@/lib/nodes'

/** The status dot's colour, by how a Node reads: green, grey (offline or unknown health), amber. */
export const NODE_TONE: Record<NodeTone, string> = {
  ok: 'bg-success',
  offline: 'bg-muted',
  unknown: 'bg-warning',
}
