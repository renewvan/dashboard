import type { ReactNode } from 'react'

/**
 * A Start-page card's empty state: the reading's icon and name over "No data yet". One component for
 * every card (and carousel slide) that has nothing to draw, so the empty states match each other.
 */
export function NoData({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      role="status"
      className="text-muted flex aspect-square w-full max-w-[260px] flex-col items-center justify-center gap-1 text-center text-sm"
    >
      <span aria-hidden="true">{icon}</span>
      <span className="font-semibold">{label}</span>
      No data yet
    </div>
  )
}
