import { useEffect, useState } from 'react'

/** Idle time before an auto-hiding navbar slides away. */
const IDLE_MS = 4000

/** Events that mean the user is still there; any of them restarts the idle clock. */
const ACTIVITY_EVENTS = [
  'pointermove',
  'pointerup',
  'pointercancel',
  'touchstart',
  'touchmove',
  'touchend',
  'click',
  'wheel',
  'scroll',
  'keydown',
] as const

/**
 * `true` once `IDLE_MS` pass without any interaction while `enabled`. Every interaction
 * (tap, drag, scroll, key) keeps a visible navbar up. Only a press (`pointerdown`) brings a
 * hidden one back, so a mouse drifting or a page scrolling cannot pop it open.
 *
 * Listeners are in the CAPTURE phase: buttons and cards stop propagation of the events they
 * handle (React Aria presses), which would otherwise never reach `window`. `scroll` does not
 * bubble at all, so it can only be seen in capture.
 */
export function useAutoHide(enabled: boolean): boolean {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let timer: number
    const arm = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setHidden(true), IDLE_MS)
    }
    const onPress = () => {
      setHidden(false)
      arm()
    }
    const options = { capture: true, passive: true } as const
    arm()
    window.addEventListener('pointerdown', onPress, options)
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, arm, options)
    return () => {
      window.removeEventListener('pointerdown', onPress, options)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, arm, options)
      window.clearTimeout(timer)
    }
  }, [enabled])

  return enabled && hidden
}
