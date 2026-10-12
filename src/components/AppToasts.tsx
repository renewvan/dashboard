import { Toast, toast } from '@heroui/react'
import { useRef, type PointerEvent } from 'react'

/** Horizontal drag distance (px) past which releasing dismisses the toast. */
const DISMISS_DISTANCE = 80
/** Release velocity (px/ms) past which a short flick dismisses the toast. */
const DISMISS_VELOCITY = 0.5
/** Movement (px) before a press becomes a swipe, so taps still hit buttons. */
const SWIPE_START_DISTANCE = 8

interface Swipe {
  pointerId: number
  startX: number
  startY: number
  lastX: number
  lastTime: number
  velocity: number
  active: boolean
}

/**
 * The app's toast region, at HeroUI's default placement. Toasts dismiss with
 * the (always visible, see `index.css`) close button or by swiping sideways —
 * the kiosk is a touchscreen, so there is no hover to reveal controls.
 */
export function AppToasts() {
  const swipe = useRef<Swipe | null>(null)

  const setDrag = (el: HTMLElement, x: number) => {
    el.style.setProperty('--swipe-x', `${x}px`)
    el.style.setProperty('--swipe-opacity', String(Math.max(0.2, 1 - Math.abs(x) / 240)))
  }
  const resetDrag = (el: HTMLElement) => {
    el.removeAttribute('data-swiping')
    el.style.removeProperty('--swipe-x')
    el.style.removeProperty('--swipe-opacity')
  }

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    // Presses on the close button / action are taps, never the start of a swipe.
    if ((event.target as HTMLElement).closest('button')) return
    swipe.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastTime: event.timeStamp,
      velocity: 0,
      active: false,
    }
  }

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const s = swipe.current
    if (!s || s.pointerId !== event.pointerId) return
    const el = event.currentTarget
    const dx = event.clientX - s.startX
    if (!s.active) {
      const dy = event.clientY - s.startY
      if (Math.abs(dx) < SWIPE_START_DISTANCE || Math.abs(dx) < Math.abs(dy)) return
      s.active = true
      el.setPointerCapture(event.pointerId)
      el.setAttribute('data-swiping', 'true')
    }
    const dt = event.timeStamp - s.lastTime
    if (dt > 0) s.velocity = (event.clientX - s.lastX) / dt
    s.lastX = event.clientX
    s.lastTime = event.timeStamp
    setDrag(el, dx)
  }

  const endSwipe = (event: PointerEvent<HTMLElement>, toastKey: string, cancelled: boolean) => {
    const s = swipe.current
    if (!s || s.pointerId !== event.pointerId) return
    swipe.current = null
    if (!s.active) return
    const el = event.currentTarget
    const dx = event.clientX - s.startX
    const dismissed =
      !cancelled &&
      (Math.abs(dx) > DISMISS_DISTANCE ||
        (Math.abs(s.velocity) > DISMISS_VELOCITY && Math.sign(s.velocity) === Math.sign(dx)))
    if (dismissed) {
      // Carry the toast off-screen in the swipe direction; close() then plays
      // HeroUI's exit fade from there.
      setDrag(el, Math.sign(dx) * el.offsetWidth)
      el.style.setProperty('--swipe-opacity', '0')
      el.removeAttribute('data-swiping')
      toast.close(toastKey)
    } else {
      resetDrag(el)
    }
  }

  return (
    <Toast.Provider maxVisibleToasts={6}>
      {({ toast: queued }) => {
        const { title, description, indicator, variant } = queued.content ?? {}
        const key = queued.key
        return (
          <Toast
            toast={queued}
            variant={variant}
            // The type, for `index.css`: HeroUI puts no variant class on the toast root.
            data-type={variant ?? 'default'}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={(event: PointerEvent<HTMLElement>) => endSwipe(event, key, false)}
            onPointerCancel={(event: PointerEvent<HTMLElement>) => endSwipe(event, key, true)}
          >
            {indicator === null ? null : (
              <Toast.Indicator variant={variant}>{indicator}</Toast.Indicator>
            )}
            <Toast.Content>
              {!!title && <Toast.Title>{title}</Toast.Title>}
              {!!description && <Toast.Description>{description}</Toast.Description>}
            </Toast.Content>
            <Toast.CloseButton />
          </Toast>
        )
      }}
    </Toast.Provider>
  )
}
