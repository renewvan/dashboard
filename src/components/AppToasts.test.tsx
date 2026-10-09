import { toast, toastQueue } from '@heroui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
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
})
