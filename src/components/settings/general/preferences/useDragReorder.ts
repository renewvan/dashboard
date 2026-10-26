import { useRef, useState, type CSSProperties, type PointerEvent } from 'react'

interface DragState {
  from: number
  to: number
  /** How far the pointer has moved down (negative: up) since the press, kept inside the list. */
  dy: number
}

interface DragSession {
  pointerId: number
  startY: number
  /** Each row's vertical centre when the press began; rows stay in their slots during the drag. */
  mids: number[]
  /** The distance from one row's top to the next, gap included: how far a displaced row moves. */
  step: number
}

const nearest = (mids: number[], y: number) =>
  mids.reduce((best, mid, i) => (Math.abs(mid - y) < Math.abs(mids[best] - y) ? i : best), 0)

/**
 * Drag-to-reorder for a vertical list of equal-height rows, on pointer events so a finger, a glove
 * and a mouse all work. The handle (`handleProps`) starts the drag and has `touch-action: none` in
 * the caller's classes, so a drag on it never scrolls the page; the rest of the row still scrolls.
 *
 * Rows stay in their slots while the pointer is down: the dragged row follows the pointer
 * (`rowStyle`) and the rows between its slot and the target slide one step out of the way. The
 * order changes once, on release, through `onReorder(from, to)`.
 */
export function useDragReorder(count: number, onReorder: (from: number, to: number) => void) {
  const rows = useRef<(HTMLElement | null)[]>([])
  const session = useRef<DragSession | null>(null)
  const latest = useRef<DragState | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

  const update = (next: DragState | null) => {
    latest.current = next
    setDrag(next)
  }

  const finish = (commit: boolean) => {
    const done = latest.current
    session.current = null
    update(null)
    if (commit && done && done.from !== done.to) onReorder(done.from, done.to)
  }

  const rowRef = (index: number) => (el: HTMLElement | null) => {
    rows.current[index] = el
  }

  const handleProps = (index: number) => ({
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.button !== 0 || session.current) return
      const rects = rows.current.slice(0, count).map((el) => el?.getBoundingClientRect())
      if (rects.length !== count || rects.some((r) => r === undefined)) return
      const boxes = rects as DOMRect[]
      e.currentTarget.setPointerCapture?.(e.pointerId)
      session.current = {
        pointerId: e.pointerId,
        startY: e.clientY,
        mids: boxes.map((r) => r.top + r.height / 2),
        step: boxes.length > 1 ? boxes[1].top - boxes[0].top : boxes[0].height,
      }
      update({ from: index, to: index, dy: 0 })
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const s = session.current
      const current = latest.current
      if (!s || !current || e.pointerId !== s.pointerId) return
      const mid = s.mids[current.from]
      const dy = Math.min(
        Math.max(e.clientY - s.startY, s.mids[0] - mid),
        s.mids[s.mids.length - 1] - mid,
      )
      update({ from: current.from, to: nearest(s.mids, mid + dy), dy })
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      if (session.current?.pointerId === e.pointerId) finish(true)
    },
    onPointerCancel(e: PointerEvent<HTMLElement>) {
      if (session.current?.pointerId === e.pointerId) finish(false)
    },
  })

  /** Inline style for row `index` while a drag is on; `undefined` when none is. */
  const rowStyle = (index: number): CSSProperties | undefined => {
    const s = session.current
    if (!drag || !s) return undefined
    if (index === drag.from) {
      return { transform: `translateY(${drag.dy}px)`, zIndex: 10, position: 'relative' }
    }
    const shift =
      drag.from < drag.to && index > drag.from && index <= drag.to
        ? -s.step
        : drag.to < drag.from && index >= drag.to && index < drag.from
          ? s.step
          : 0
    return { transform: `translateY(${shift}px)`, transition: 'transform 150ms ease-out' }
  }

  return { rowRef, rowStyle, handleProps, draggingIndex: drag?.from ?? null }
}
