import { toast } from '@heroui/react'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Tank } from '@/types'
import type { ConnectionStatus } from './useRenewvanBus'
import { useAlertToasts } from './useAlertToasts.heroui'
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

/** Spies on every toast entry point the hook uses, so nothing reaches the real queue. */
function spyToasts(ids: { danger?: string; warning?: string } = {}) {
  return {
    danger: vi.spyOn(toast, 'danger').mockReturnValue(ids.danger ?? 't1'),
    warning: vi.spyOn(toast, 'warning').mockReturnValue(ids.warning ?? 't2'),
    close: vi.spyOn(toast, 'close').mockImplementation(() => {}),
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('useAlertToasts', () => {
  it('adds a danger toast when a tank enters alarm_state', () => {
    const { danger, warning } = spyToasts()

    renderHook(() =>
      useAlertToasts({
        tanks: { fresh: alarmTank },
        status: 'connected',
        tailscale: null,
        enabled: true,
      }),
    )

    expect(danger).toHaveBeenCalledWith(
      'Fresh water tank alarm',
      expect.objectContaining({ description: 'Level requires attention.', timeout: 0 }),
    )
    expect(warning).not.toHaveBeenCalled()
  })

  it('closes the toast once the tank alarm clears (state-driven dismiss)', () => {
    const { close } = spyToasts()

    const { rerender } = renderHook(
      ({ tanks }) => useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true }),
      { initialProps: { tanks: { fresh: alarmTank } } },
    )

    rerender({ tanks: { fresh: okTank } })

    expect(close).toHaveBeenCalledWith('t1')
  })

  it('does not add a toast for a tank in ok state', () => {
    const { danger, warning } = spyToasts()

    renderHook(() =>
      useAlertToasts({
        tanks: { fresh: okTank },
        status: 'connected',
        tailscale: null,
        enabled: true,
      }),
    )

    expect(danger).not.toHaveBeenCalled()
    expect(warning).not.toHaveBeenCalled()
  })

  it('does not re-add a toast for a tank that stays in alarm across renders', () => {
    const { danger } = spyToasts()

    const { rerender } = renderHook(
      ({ tanks }) => useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true }),
      { initialProps: { tanks: { fresh: alarmTank } } },
    )
    rerender({ tanks: { fresh: { ...alarmTank } } })

    expect(danger).toHaveBeenCalledTimes(1)
  })

  it('adds a warning toast when the MQTT connection is disconnected', () => {
    const { danger, warning } = spyToasts()

    renderHook(() =>
      useAlertToasts({ tanks: {}, status: 'disconnected', tailscale: null, enabled: true }),
    )

    expect(warning).toHaveBeenCalledWith(
      'Hub connection lost',
      expect.objectContaining({ description: 'Live data may be out of date.', timeout: 0 }),
    )
    expect(danger).not.toHaveBeenCalled()
  })

  it('closes the MQTT warning toast on reconnect', () => {
    const { close } = spyToasts()

    const { rerender } = renderHook<void, { status: ConnectionStatus }>(
      ({ status }) => useAlertToasts({ tanks: {}, status, tailscale: null, enabled: true }),
      { initialProps: { status: 'disconnected' } },
    )
    rerender({ status: 'connected' })

    expect(close).toHaveBeenCalledWith('t2')
  })

  it('adds a warning toast when tailscale reports disconnected', () => {
    const { warning } = spyToasts({ warning: 't3' })

    renderHook(() =>
      useAlertToasts({
        tanks: {},
        status: 'connected',
        tailscale: { enabled: true, connected: false, ip: null, hostname: null, peers: 0 },
        enabled: true,
      }),
    )

    expect(warning).toHaveBeenCalledWith(
      'Tailscale disconnected',
      expect.objectContaining({ description: 'Remote access is unavailable.', timeout: 0 }),
    )
  })

  it('does not add a tailscale toast while status is still unknown (null)', () => {
    const { danger, warning } = spyToasts()

    renderHook(() =>
      useAlertToasts({ tanks: {}, status: 'connected', tailscale: null, enabled: true }),
    )

    expect(danger).not.toHaveBeenCalled()
    expect(warning).not.toHaveBeenCalled()
  })

  it('skips incomplete tank records (still accumulating from MQTT)', () => {
    const { danger, warning } = spyToasts()

    renderHook(() =>
      useAlertToasts({
        tanks: { fresh: { alarm_state: 'alarm' } as Partial<Tank> as Tank },
        status: 'connected',
        tailscale: null,
        enabled: true,
      }),
    )

    expect(danger).not.toHaveBeenCalled()
    expect(warning).not.toHaveBeenCalled()
  })

  describe('when alerts are disabled', () => {
    it('adds no toast but still records history for a new alarm', () => {
      const { danger } = spyToasts()
      const append = vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      renderHook(() =>
        useAlertToasts({
          tanks: { fresh: alarmTank },
          status: 'connected',
          tailscale: null,
          enabled: false,
        }),
      )

      expect(danger).not.toHaveBeenCalled()
      expect(append).toHaveBeenCalledTimes(1)
    })

    it('closes an open toast when muted, without acknowledging it', () => {
      const { close } = spyToasts()
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
      rerender({ enabled: false })

      expect(close).toHaveBeenCalledWith('t1')
      expect(ack).not.toHaveBeenCalled()
    })

    it('re-shows a still-open alert when un-muted, without a duplicate history entry', () => {
      const { danger } = spyToasts()
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
      expect(danger).not.toHaveBeenCalled()

      rerender({ enabled: true })

      expect(danger).toHaveBeenCalledTimes(1)
      expect(append).toHaveBeenCalledTimes(1)
    })

    it('resolves history when a muted alert clears, with no toast to close', () => {
      const { close } = spyToasts()
      const resolve = vi.spyOn(alertHistory, 'resolveAlertHistoryEntry')
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      const { rerender } = renderHook(
        ({ tanks }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: false }),
        { initialProps: { tanks: { fresh: alarmTank } } },
      )
      rerender({ tanks: { fresh: okTank } })

      expect(resolve).toHaveBeenCalledWith('h1')
      expect(close).not.toHaveBeenCalled()
    })
  })

  describe('acknowledging history', () => {
    // Mirrors HeroUI: a toast's `onClose` fires for any close, including a
    // programmatic `toast.close(id)`. Capturing it lets each test play the
    // driver's dismissal or the library's reaction to the hook's own close.
    function captureOnClose() {
      let onClose: (() => void) | undefined
      vi.spyOn(toast, 'danger').mockImplementation((_title, options) => {
        onClose = options?.onClose
        return 't1'
      })
      vi.spyOn(toast, 'close').mockImplementation(() => onClose?.())
      return () => onClose?.()
    }

    it('acknowledges the history entry when the driver dismisses the toast', () => {
      const dismiss = captureOnClose()
      const ack = vi.spyOn(alertHistory, 'acknowledgeAlertHistoryEntry')
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      renderHook(() =>
        useAlertToasts({
          tanks: { fresh: alarmTank },
          status: 'connected',
          tailscale: null,
          enabled: true,
        }),
      )
      dismiss()

      expect(ack).toHaveBeenCalledTimes(1)
      expect(ack).toHaveBeenCalledWith('h1')
    })

    it('does not acknowledge when the hook itself closes the toast', () => {
      captureOnClose()
      const ack = vi.spyOn(alertHistory, 'acknowledgeAlertHistoryEntry')
      const resolve = vi.spyOn(alertHistory, 'resolveAlertHistoryEntry')
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      const { rerender } = renderHook(
        ({ tanks }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true }),
        { initialProps: { tanks: { fresh: alarmTank } } },
      )
      rerender({ tanks: { fresh: okTank } })

      expect(toast.close).toHaveBeenCalledWith('t1')
      expect(resolve).toHaveBeenCalledWith('h1')
      expect(ack).not.toHaveBeenCalled()
    })
  })
})
