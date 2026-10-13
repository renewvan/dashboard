import { Droplet } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useNow } from '@/hooks/useNow'
import { sortTankIds } from '@/lib/tank-display'
import { isCompleteTank, type Tank } from '@/types'
import { TankCard } from './TankCard'
import { TankRow } from './TankRow'

export interface TanksPageProps {
  tanks: Record<string, Tank>
  /** Opens a tank's settings (its Configure button). */
  onConfigure: (id: string) => void
}

/** Drain/fill pace only needs minute resolution. */
const PACE_REFRESH_MS = 30_000

/**
 * Kiosk (800px and wider): one row of equal cards. Phone: one scrolling row per
 * tank. The switch is the shell's own breakpoint (`useIsMobile`), the one that
 * swaps the rail for the bottom bar. There is deliberately no count cap: with
 * four or more tanks the kiosk cards lose room; revisit if a fourth tank ever
 * publishes (the van publishes fresh and grey only).
 */
export function TanksPage({ tanks, onConfigure }: TanksPageProps) {
  const isMobile = useIsMobile()
  const now = new Date(useNow(PACE_REFRESH_MS))

  // MQTT builds a tank up one property per retained message; skip any id whose
  // record hasn't fully arrived yet (see `isCompleteTank`).
  const ids = sortTankIds(Object.keys(tanks).filter((id) => isCompleteTank(tanks[id])))

  if (ids.length === 0) {
    return (
      <section className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
        <Droplet aria-hidden="true" className="text-muted size-5" />
        <h2 className="text-foreground text-lg font-semibold">No tank data yet.</h2>
        <p className="text-muted text-sm">Waiting for readings from the renewvan hub.</p>
      </section>
    )
  }

  if (isMobile) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto p-4">
        {ids.map((id) => (
          <TankRow key={id} id={id} tank={tanks[id]} now={now} onConfigure={onConfigure} />
        ))}
      </div>
    )
  }

  return (
    <div
      className="grid h-full min-h-0 flex-1 gap-3 p-4"
      style={{ gridTemplateColumns: `repeat(${ids.length}, minmax(0, 1fr))` }}
    >
      {ids.map((id) => (
        <TankCard key={id} id={id} tank={tanks[id]} now={now} onConfigure={onConfigure} />
      ))}
    </div>
  )
}
