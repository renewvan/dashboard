import { useEffect, useState } from 'react'

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Live 24-hour HH:MM clock for the header, next to the connection status
 * button. No seconds, no AM/PM — minute precision is all a glance at a
 * kiosk needs, and 24h avoids an extra AM/PM label competing for space
 * next to the connection icon.
 *
 * Re-renders once a minute, not once a second: the display only ever
 * shows minute resolution, so a per-second tick would just be wasted
 * re-renders. Recomputes the delay to the next minute boundary each tick
 * rather than a fixed 60000ms interval, so it can't visibly drift out of
 * phase with the wall clock over a long-running kiosk session.
 */
export function Clock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timeoutId: number

    function scheduleNextTick() {
      const msToNextMinute = 60000 - (Date.now() % 60000)
      timeoutId = window.setTimeout(() => {
        setNow(new Date())
        scheduleNextTick()
      }, msToNextMinute)
    }
    scheduleNextTick()

    return () => window.clearTimeout(timeoutId)
  }, [])

  return (
    <time
      dateTime={now.toISOString()}
      data-testid="clock"
      className="text-sm text-white! tabular-nums"
    >
      {formatTime(now)}
    </time>
  )
}
