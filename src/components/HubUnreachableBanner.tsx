import { BatteryCharging } from 'lucide-react'

/**
 * Shown under the header when the broker link has been down for a while on a phone or laptop: the van is
 * probably parked with the hub off. One tap goes to the wake page, which powers it on over Bluetooth
 * and runs from the cached app shell, so it works with the hub off.
 */
export function HubUnreachableBanner() {
  return (
    <div
      role="status"
      className="bg-warning/15 text-foreground flex shrink-0 items-center justify-between gap-3 px-4 py-2 text-sm"
    >
      <span>Can’t reach the hub. Is the van parked with it off?</span>
      <a
        href="/?page=wake"
        className="bg-warning text-warning-foreground flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 font-semibold"
      >
        <BatteryCharging className="size-4" aria-hidden="true" />
        Wake the van
      </a>
    </div>
  )
}
