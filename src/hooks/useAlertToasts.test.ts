import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { toastManager } from '@/components/ui/toast'
import type { Tank } from '@/types'
import type { ConnectionStatus } from './useRenewvanBus'
import { useAlertToasts } from './useAlertToasts'
import * as alertHistory from '@/lib/alertHistory'

const okTank: Tank = {
  fluid_type: 'fresh_water',
  capacity_l: 100,
  level_pct: 50,
  status: 'ok',
  volume_since_full_l: 0,
  volume_since_empty_l: 0,
}
const alarmTank: Tank = { ...okTank, alarm_state: 'alarm' }

// The hook defers add()/close() to a microtask (see useAlertToasts.ts —
// avoids a real race against ToastProvider's own subscribe effect); tests
// must flush microtasks before asserting.
const flush = () => Promise.resolve()

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAlertToasts', () => {
  it('adds a critical toast when a tank enters alarm_state', async () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('t1')

    renderHook(() =>
      useAlertToasts({
        tanks: { fresh: alarmTank },
        status: 'connected',
        tailscale: null,
        enabled: true,
      }),
    )
    await flush()

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', title: 'Fresh water tank alarm', timeout: 0 }),
    )
  })

  it('closes the toast once the tank alarm clears (state-driven dismiss)', async () => {
    vi.spyOn(toastManager, 'add').mockReturnValue('t1')
    const close = vi.spyOn(toastManager, 'close').mockImplementation(() => {})

    const { rerender } = renderHook(
      ({ tanks }) => useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true }),
      { initialProps: { tanks: { fresh: alarmTank } } },
    )
    await flush()

    rerender({ tanks: { fresh: okTank } })
    await flush()

    expect(close).toHaveBeenCalledWith('t1')
  })

  it('does not add a toast for a tank in ok state', async () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('t1')

    renderHook(() =>
      useAlertToasts({
        tanks: { fresh: okTank },
        status: 'connected',
        tailscale: null,
        enabled: true,
      }),
    )
    await flush()

    expect(add).not.toHaveBeenCalled()
  })

  it('does not re-add a toast for a tank that stays in alarm across renders', async () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('t1')

    const { rerender } = renderHook(
      ({ tanks }) => useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true }),
      { initialProps: { tanks: { fresh: alarmTank } } },
    )
    await flush()
    rerender({ tanks: { fresh: { ...alarmTank } } })
    await flush()

    expect(add).toHaveBeenCalledTimes(1)
  })

  it('adds a warning toast when the MQTT connection is disconnected', async () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('t2')

    renderHook(() =>
      useAlertToasts({ tanks: {}, status: 'disconnected', tailscale: null, enabled: true }),
    )
    await flush()

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'warning', title: 'Hub connection lost', timeout: 0 }),
    )
  })

  it('closes the MQTT warning toast on reconnect', async () => {
    vi.spyOn(toastManager, 'add').mockReturnValue('t2')
    const close = vi.spyOn(toastManager, 'close').mockImplementation(() => {})

    const { rerender } = renderHook<void, { status: ConnectionStatus }>(
      ({ status }) => useAlertToasts({ tanks: {}, status, tailscale: null, enabled: true }),
      { initialProps: { status: 'disconnected' } },
    )
    await flush()
    rerender({ status: 'connected' })
    await flush()

    expect(close).toHaveBeenCalledWith('t2')
  })

  it('adds a warning toast when tailscale reports disconnected', async () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('t3')

    renderHook(() =>
      useAlertToasts({
        tanks: {},
        status: 'connected',
        tailscale: { enabled: true, connected: false, ip: null, hostname: null, peers: 0 },
        enabled: true,
      }),
    )
    await flush()

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'warning', title: 'Tailscale disconnected', timeout: 0 }),
    )
  })

  it('does not add a tailscale toast while status is still unknown (null)', async () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('t3')

    renderHook(() =>
      useAlertToasts({ tanks: {}, status: 'connected', tailscale: null, enabled: true }),
    )
    await flush()

    expect(add).not.toHaveBeenCalled()
  })

  it('skips incomplete tank records (still accumulating from MQTT)', async () => {
    const add = vi.spyOn(toastManager, 'add').mockReturnValue('t1')

    renderHook(() =>
      useAlertToasts({
        tanks: { fresh: { alarm_state: 'alarm' } as Partial<Tank> as Tank },
        status: 'connected',
        tailscale: null,
        enabled: true,
      }),
    )
    await flush()

    expect(add).not.toHaveBeenCalled()
  })

  describe('when alerts are disabled', () => {
    it('adds no toast but still records history for a new alarm', async () => {
      const add = vi.spyOn(toastManager, 'add').mockReturnValue('t1')
      const append = vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      renderHook(() =>
        useAlertToasts({
          tanks: { fresh: alarmTank },
          status: 'connected',
          tailscale: null,
          enabled: false,
        }),
      )
      await flush()

      expect(add).not.toHaveBeenCalled()
      expect(append).toHaveBeenCalledTimes(1)
    })

    it('closes an open toast when muted, without acknowledging it', async () => {
      vi.spyOn(toastManager, 'add').mockReturnValue('t1')
      const close = vi.spyOn(toastManager, 'close').mockImplementation(() => {})
      const ack = vi.spyOn(alertHistory, 'acknowledgeAlertHistoryEntry')

      const { rerender } = renderHook(
        ({ enabled }) =>
          useAlertToasts({
            tanks: { fresh: alarmTank },
            status: 'connected',
            tailscale: null,
            enabled,
          }),
        { initialProps: { enabled: true } },
      )
      await flush()
      rerender({ enabled: false })
      await flush()

      expect(close).toHaveBeenCalledWith('t1')
      expect(ack).not.toHaveBeenCalled()
    })

    it('re-shows a still-open alert when un-muted, without a duplicate history entry', async () => {
      const add = vi.spyOn(toastManager, 'add').mockReturnValue('t1')
      vi.spyOn(toastManager, 'close').mockImplementation(() => {})
      const append = vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      const { rerender } = renderHook(
        ({ enabled }) =>
          useAlertToasts({
            tanks: { fresh: alarmTank },
            status: 'connected',
            tailscale: null,
            enabled,
          }),
        { initialProps: { enabled: false } },
      )
      await flush()
      expect(add).not.toHaveBeenCalled()

      rerender({ enabled: true })
      await flush()

      expect(add).toHaveBeenCalledTimes(1)
      expect(append).toHaveBeenCalledTimes(1)
    })

    it('resolves history when a muted alert clears, with no toast to close', async () => {
      const close = vi.spyOn(toastManager, 'close').mockImplementation(() => {})
      const resolve = vi.spyOn(alertHistory, 'resolveAlertHistoryEntry')
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      const { rerender } = renderHook(
        ({ tanks }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: false }),
        { initialProps: { tanks: { fresh: alarmTank } } },
      )
      await flush()
      rerender({ tanks: { fresh: okTank } })
      await flush()

      expect(resolve).toHaveBeenCalledWith('h1')
      expect(close).not.toHaveBeenCalled()
    })
  })
})
