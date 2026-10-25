import { SatelliteOff } from './SatelliteOff'
import { cn } from '@/lib/utils'
import { MAP_GLASS } from './mapGlass'

/**
 * Says why there is no van on the map: the hub has sent no GPS data, or the receiver has no fix
 * yet. A notice over the map, not a pane, so the map stays usable. Bottom-left, where the readout
 * sits once there is a fix. No controls; pointers pass through to the map.
 */
export function GpsStatusNotice({
  satellites,
  compact = false,
  className,
}: {
  /** Satellites being tracked, or undefined while the hub has sent no GPS record at all. */
  satellites: number | undefined
  /** Just the icon, for a phone while the map credits are open: their text needs the room. */
  compact?: boolean
  className?: string
}) {
  const waitingForFix = satellites !== undefined
  const title = waitingForFix ? 'No GPS fix yet' : 'No GPS data yet'
  if (compact) {
    return (
      <div
        role="status"
        aria-label={title}
        data-testid="gps-status"
        // The same 24px circle as the readout's compact pin, on the same baseline as MapLibre's (i).
        className={cn(
          MAP_GLASS,
          'pointer-events-none z-10 flex size-6 items-center justify-center rounded-full!',
          className,
        )}
      >
        <SatelliteOff aria-hidden="true" className="size-3 text-red-500" />
      </div>
    )
  }
  return (
    <div
      role="status"
      data-testid="gps-status"
      className={cn(
        MAP_GLASS,
        'pointer-events-none z-10 flex max-w-[calc(100%-2rem)] items-start gap-2.5 px-4 py-2.5',
        className,
      )}
    >
      <SatelliteOff aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-red-500" />
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-white/70">
          {waitingForFix
            ? `Tracking ${satellites} satellite(s) — waiting for a fix.`
            : 'Waiting for readings from the renewvan hub.'}
        </span>
      </div>
    </div>
  )
}
