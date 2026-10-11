import { toast, toastQueue } from '@heroui/react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubMatchMedia, type MatchMediaStub } from '@/test/matchMedia'
import { AppToasts } from './AppToasts'

// Renders the toast region exactly as `main.tsx` mounts it. Placement and
// the header offset are visual (layout, which jsdom doesn't compute), so
// they are not asserted here.
let viewport: MatchMediaStub

class StubResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', StubResizeObserver)
  viewport = stubMatchMedia(1024)
  // jsdom has no Web Animations API; HeroUI's toast enter/exit transitions call it.
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
})

afterEach(async () => {
  act(() => toast.clear())
  await waitFor(() => expect(toastQueue.visibleToasts).toHaveLength(0))
  viewport.restore()
  Reflect.deleteProperty(Element.prototype, 'getAnimations')
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('AppToasts', () => {
  it('shows a fired danger toast as a visible alert', async () => {
    render(<AppToasts />)

    act(() => {
      toast.danger('Fresh water tank alarm', { timeout: 0 })
    })

    const alert = await screen.findByRole('alert')
    expect(alert).toBeVisible()
    expect(alert).toHaveTextContent('Fresh water tank alarm')
  })

  it('renders at most six toasts when more persistent alerts are queued', async () => {
    render(<AppToasts />)

    act(() => {
      for (let i = 1; i <= 8; i++) toast.danger(`Alert ${i}`, { timeout: 0 })
    })

    await screen.findAllByRole('alert')
    expect(screen.getAllByRole('alert')).toHaveLength(6)
  })

  it('removes a toast when the driver dismisses it', async () => {
    const user = userEvent.setup()
    render(<AppToasts />)
    act(() => {
      toast.danger('Fresh water tank alarm', { timeout: 0 })
      toast.warning('Hub connection lost', { timeout: 0 })
    })
    await screen.findAllByRole('alert')
    expect(screen.getAllByRole('alert')).toHaveLength(2)

    await user.click(screen.getAllByRole('button', { name: /close/i })[0])

    await waitFor(() => expect(screen.getAllByRole('alert')).toHaveLength(1))
    expect(
      screen.queryByText('Fresh water tank alarm') ?? screen.queryByText('Hub connection lost'),
    ).not.toBeNull()
  })

  describe('swipe to dismiss', () => {
    // jsdom has no pointer capture and no layout; stub what the handler touches.
    beforeEach(() => {
      Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
        configurable: true,
        value: () => {},
      })
    })
    afterEach(() => {
      Reflect.deleteProperty(HTMLElement.prototype, 'setPointerCapture')
    })

    // The handler derives release velocity from `event.timeStamp` deltas. jsdom
    // stamps events ~1ms apart (every drag becomes a flick) and React reports
    // pointerdown's real clock regardless of overrides, so the later events are
    // stamped relative to the down event's actual timestamp.
    const swipe = (el: HTMLElement, from: number, to: number, durationMs = 500) => {
      const init = { pointerId: 1, pointerType: 'touch', clientY: 100 }
      const down = new PointerEvent('pointerdown', { ...init, clientX: from, bubbles: true })
      fireEvent(el, down)
      const at = down.timeStamp + durationMs
      fireEvent(el, stamped('pointermove', { ...init, clientX: to }, at))
      fireEvent(el, stamped('pointerup', { ...init, clientX: to }, at))
    }
    const stamped = (type: string, init: PointerEventInit, at: number) => {
      const event = new PointerEvent(type, { ...init, bubbles: true })
      Object.defineProperty(event, 'timeStamp', { value: at })
      return event
    }

    it('dismisses a toast dragged past the distance threshold', async () => {
      render(<AppToasts />)
      act(() => {
        toast.danger('Fresh water tank alarm', { timeout: 0 })
      })
      const alert = await screen.findByRole('alert')

      swipe(alert, 300, 150)

      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    })

    it('keeps a toast that is released after a short drag', async () => {
      render(<AppToasts />)
      act(() => {
        toast.danger('Fresh water tank alarm', { timeout: 0 })
      })
      const alert = await screen.findByRole('alert')

      swipe(alert, 300, 270)

      expect(screen.getByRole('alert')).toHaveTextContent('Fresh water tank alarm')
      expect(alert.style.getPropertyValue('--swipe-x')).toBe('')
    })

    it('dismisses a toast flicked fast even over a short distance', async () => {
      render(<AppToasts />)
      act(() => {
        toast.danger('Fresh water tank alarm', { timeout: 0 })
      })
      const alert = await screen.findByRole('alert')

      swipe(alert, 300, 260, 20)

      await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    })

    it('does not treat a press on the close button as a swipe', async () => {
      render(<AppToasts />)
      act(() => {
        toast.danger('Fresh water tank alarm', { timeout: 0 })
      })
      const close = await screen.findByRole('button', { name: /close/i })

      swipe(close, 300, 100)

      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
