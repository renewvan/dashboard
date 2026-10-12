import { toast, toastQueue } from '@heroui/react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useUnseenAlertCount } from './useUnseenAlertCount'

// Uses the real HeroUI queue (no provider mounted: the queue is module-level
// and retains toasts regardless). Closing toasts stay in the queue for their
// exit animation, so drain it between tests to keep each hook's initial
// snapshot empty.
afterEach(async () => {
  act(() => toast.clear())
  await waitFor(() => expect(toastQueue.visibleToasts).toHaveLength(0))
})

describe('useUnseenAlertCount', () => {
  it('counts each new alert once', () => {
    const { result } = renderHook(() => useUnseenAlertCount('home'))
    expect(result.current).toBe(0)

    act(() => {
      toast.danger('Fresh water tank alarm', { timeout: 0 })
    })
    expect(result.current).toBe(1)

    act(() => {
      toast.warning('Hub connection lost', { timeout: 0 })
    })
    expect(result.current).toBe(2)
  })

  it('does not recount an alert on re-render', () => {
    const { result, rerender } = renderHook(({ tab }) => useUnseenAlertCount(tab), {
      initialProps: { tab: 'home' },
    })
    act(() => {
      toast.danger('Fresh water tank alarm', { timeout: 0 })
    })

    rerender({ tab: 'tanks' })
    rerender({ tab: 'home' })

    expect(result.current).toBe(1)
  })

  it('does not count alerts that arrive while the alerts tab is active', () => {
    const { result } = renderHook(() => useUnseenAlertCount('alerts'))

    act(() => {
      toast.danger('Fresh water tank alarm', { timeout: 0 })
    })

    expect(result.current).toBe(0)
  })

  it('resets to zero on visiting the alerts tab', () => {
    const { result, rerender } = renderHook(({ tab }) => useUnseenAlertCount(tab), {
      initialProps: { tab: 'home' },
    })
    act(() => {
      toast.danger('Fresh water tank alarm', { timeout: 0 })
      toast.warning('Hub connection lost', { timeout: 0 })
    })
    expect(result.current).toBe(2)

    rerender({ tab: 'alerts' })

    expect(result.current).toBe(0)
  })

  it('is unaffected by dismissing a toast', () => {
    const { result } = renderHook(() => useUnseenAlertCount('home'))
    let id = ''
    act(() => {
      id = toast.danger('Fresh water tank alarm', { timeout: 0 })
    })
    expect(result.current).toBe(1)

    act(() => toast.close(id))

    expect(result.current).toBe(1)
  })
})
