// The Primary battery's active BMS protections, named where the battery is drawn (CONTEXT.md
// **BMS alert**). Colour is severity only: amber for advisory protections, danger for the rest.

import { TriangleAlert } from 'lucide-react'
import type { PowerSnapshot } from './flowModel'

export function BmsAlertBadge({
  flow,
  className = '',
}: {
  flow: PowerSnapshot
  className?: string
}) {
  const alert = flow.bmsAlert
  if (alert === undefined) return null
  return (
    <span
      data-testid="bms-alert"
      data-tone={alert.tone}
      className={`flex items-center justify-center gap-1.5 text-center font-medium whitespace-nowrap ${
        alert.tone === 'danger' ? 'text-danger' : 'text-warning'
      } ${className}`}
    >
      <TriangleAlert aria-hidden="true" className="size-[1em] shrink-0" />
      {alert.names.join(' · ')}
    </span>
  )
}
