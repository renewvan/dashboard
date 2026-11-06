// The label under the van's charge readout: what the battery is doing, in
// the Tiles' wording, plus the time to empty when the battery publishes an estimate.

import { formatTimeToGo } from '@/lib/time-to-go'
import { BATTERY_STATE_LABEL, type PowerSnapshot } from './flowModel'

export function BatteryState({
  flow,
  className = '',
  small = false,
}: {
  flow: PowerSnapshot
  className?: string
  /** One step smaller, for a tight spot under the van. */
  small?: boolean
}) {
  const togo = flow.timeToGoS === undefined ? undefined : formatTimeToGo(flow.timeToGoS)
  return (
    <span
      className={`text-muted flex items-baseline gap-2 ${small ? 'text-base' : 'text-lg'} ${className}`}
    >
      {BATTERY_STATE_LABEL[flow.batteryState]}
      {togo ? (
        <span className={`text-foreground ${small ? 'text-sm' : 'text-base'}`}>· {togo}</span>
      ) : null}
    </span>
  )
}
