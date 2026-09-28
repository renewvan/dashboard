import { useEffect, useRef } from 'react'
import type { DisplayPower } from '../hooks/useRenewvanBus'

export interface SleepOverlayProps {
  displayPower: DisplayPower
  onWake: () => void
}

/**
 * Fullscreen black overlay rendered when the kiosk display is sleeping
 * (renewvan/kiosk/display/power = "off"). The first pointerdown swallows
 * the event and calls onWake() — matching Venus OS GUI-v2's ScreenBlanker
 * behaviour where the waking touch is consumed, not forwarded.
 *
 * Rendered as null when displayPower is "on" or null (not yet received),
 * so there is no flash on initial load before the retained topic arrives.
 *
 * Stays hand-rolled (per ticket 06): Base UI's `Dialog`/`Popover`
 * primitives bring focus-trap, Escape-to-close, and backdrop-click-dismiss
 * semantics that don't fit a kiosk overlay meant to wake on *any* touch
 * with no keyboard/focus interaction model — same reasoning as
 * `RadialGauge` staying bespoke (ticket 02). Styling still moved off
 * per-component CSS onto Tailwind utility classes for consistency with the
 * rest of the migrated app.
 */
export function SleepOverlay({ displayPower, onWake }: SleepOverlayProps) {
  const onWakeRef = useRef(onWake)
  useEffect(() => {
    onWakeRef.current = onWake
  })

  if (displayPower !== 'off') return null

  function handlePointerDown(e: React.PointerEvent) {
    e.stopPropagation()
    e.preventDefault()
    onWakeRef.current()
  }

  return (
    <div
      className="fixed inset-0 z-[9999] cursor-pointer bg-background"
      data-testid="sleep-overlay"
      onPointerDown={handlePointerDown}
    />
  )
}
