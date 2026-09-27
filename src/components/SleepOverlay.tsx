import { useEffect, useRef } from 'react'
import type { DisplayPower } from '../hooks/useRenewvanBus'
import './SleepOverlay.css'

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
      className="sleep-overlay"
      data-testid="sleep-overlay"
      onPointerDown={handlePointerDown}
    />
  )
}
