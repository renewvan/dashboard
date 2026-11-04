import { useEffect, useState } from 'react'
import { formatClock } from '@/lib/heater'
import type { Heater } from '@/types'

/**
 * The heater reports its runtime every few seconds; the clock fills the gaps. It checks four times a
 * second so a displayed second never trails the real one (or the Start press) by more than a quarter.
 */
const TICK_MS = 250

/**
 * How long the heater has been on, as Venus OS shows it: it starts at 0:00 when the heater leaves
 * Off (the Start button), counts every second, re-syncs to the heater's own `runtime_s` whenever
 * that arrives, and goes back to 0:00 when the heater is off again.
 */
export function RunTime({ heater, reporting }: { heater: Heater; reporting: boolean }) {
  const on = heater.phase !== undefined && heater.phase !== 'off'
  const runtime = heater.runtime_s
  // Always ticking, so `now` is never more than a second old when the heater changes state.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const handle = window.setInterval(() => setNow(Date.now()), TICK_MS)
    return () => window.clearInterval(handle)
  }, [])

  const [seen, setSeen] = useState({ on, runtime })
  const [sync, setSync] = useState({ base: runtime ?? 0, at: now })
  if (seen.on !== on || seen.runtime !== runtime) {
    setSeen({ on, runtime })
    // Off, or off to on (the start): count from zero, whatever the heater last reported. While on,
    // the heater's own figure wins whenever it arrives.
    if (!on || !seen.on) setSync({ base: 0, at: now })
    else if (runtime !== undefined) setSync({ base: runtime, at: now })
  }

  const seconds = on ? sync.base + (now - sync.at) / 1000 : 0
  return (
    // First column, so it opens the last row of the readings grid, beside the sensor dropdown.
    <div className="col-start-1 flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted text-xs">Runtime</dt>
      <dd className="flex min-h-9 items-center font-semibold tabular-nums">
        {reporting ? formatClock(seconds) : '—'}
      </dd>
    </div>
  )
}
