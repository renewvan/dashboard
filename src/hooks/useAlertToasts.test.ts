import { toast } from '@heroui/react'
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
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

  describe('in demo mode', () => {
    const demoArgs = { status: 'connected' as const, tailscale: null, enabled: true, demo: true }

    it('still shows the toast, so the alert UI can be developed against the demo', () => {
      const { danger } = spyToasts()
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry')

      renderHook(() => useAlertToasts({ tanks: { fresh: alarmTank }, ...demoArgs }))

      expect(danger).toHaveBeenCalledTimes(1)
    })

    it('never writes an alert to the persistent history', () => {
      spyToasts()
      const append = vi.spyOn(alertHistory, 'appendAlertHistoryEntry')

      renderHook(() => useAlertToasts({ tanks: { fresh: alarmTank }, ...demoArgs }))

      expect(append).not.toHaveBeenCalled()
    })

    it('does not resolve or acknowledge history when a demo alarm clears or is dismissed', () => {
      spyToasts()
      const resolve = vi.spyOn(alertHistory, 'resolveAlertHistoryEntry')
      const ack = vi.spyOn(alertHistory, 'acknowledgeAlertHistoryEntry')

      const { rerender } = renderHook(({ tanks }) => useAlertToasts({ tanks, ...demoArgs }), {
        initialProps: { tanks: { fresh: alarmTank } },
      })
      rerender({ tanks: { fresh: okTank } })

      expect(resolve).not.toHaveBeenCalled()
      expect(ack).not.toHaveBeenCalled()
    })

    it('does not touch the history entry of a real alarm that is still open when demo mode starts', () => {
      spyToasts()
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('real-1')
      const resolve = vi.spyOn(alertHistory, 'resolveAlertHistoryEntry')

      // A real alarm is open; then someone switches demo on, so `tanks` becomes the demo van's.
      const { rerender } = renderHook(
        ({ tanks, demo }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true, demo }),
        { initialProps: { tanks: { fresh: alarmTank }, demo: false } },
      )
      rerender({ tanks: { fresh: okTank }, demo: true })

      expect(resolve).not.toHaveBeenCalledWith('real-1')
    })

    it('does not duplicate the history row of a real connection alert when demo is toggled', () => {
      spyToasts()
      const append = vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('conn-1')

      // The hub link is down (a real, ongoing condition that has nothing to do with the demo van).
      const { rerender } = renderHook(
        ({ demo }) =>
          useAlertToasts({
            tanks: {},
            status: 'disconnected',
            tailscale: null,
            enabled: true,
            demo,
          }),
        { initialProps: { demo: false } },
      )
      expect(append).toHaveBeenCalledTimes(1)
      rerender({ demo: true })
      rerender({ demo: false })

      expect(append).toHaveBeenCalledTimes(1)
    })

    it('does not add a second history row for a real alarm that stays open across a demo round trip', () => {
      spyToasts()
      const append = vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('real-1')
      const resolve = vi.spyOn(alertHistory, 'resolveAlertHistoryEntry')

      // A real alarm is open and recorded. Demo mode is switched on (the van swaps to the demo one,
      // which is fine), then off again: the SAME real alarm is still open, so it must not be
      // recorded a second time, and it must not be resolved while demo was only being looked at.
      const { rerender } = renderHook(
        ({ tanks, demo }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true, demo }),
        { initialProps: { tanks: { fresh: alarmTank }, demo: false } },
      )
      expect(append).toHaveBeenCalledTimes(1)
      rerender({ tanks: { fresh: okTank }, demo: true })
      rerender({ tanks: { fresh: alarmTank }, demo: false })

      expect(append).toHaveBeenCalledTimes(1)
      expect(resolve).not.toHaveBeenCalled()
    })

    it('shows the real alarm toast again, once, when demo mode ends and it is still open', () => {
      const { danger } = spyToasts()
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('real-1')

      const { rerender } = renderHook(
        ({ tanks, demo }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true, demo }),
        { initialProps: { tanks: { fresh: alarmTank }, demo: false } },
      )
      expect(danger).toHaveBeenCalledTimes(1)
      rerender({ tanks: { fresh: okTank }, demo: true })
      rerender({ tanks: { fresh: alarmTank }, demo: false })

      expect(danger).toHaveBeenCalledTimes(2) // the original, and one on return, not a stack
    })

    it('resolves the real alarm normally if it really clears while demo mode is off', () => {
      spyToasts()
      vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('real-1')
      const resolve = vi.spyOn(alertHistory, 'resolveAlertHistoryEntry')

      const { rerender } = renderHook(
        ({ tanks, demo }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true, demo }),
        { initialProps: { tanks: { fresh: alarmTank }, demo: false } },
      )
      rerender({ tanks: { fresh: okTank }, demo: true })
      rerender({ tanks: { fresh: alarmTank }, demo: false })
      rerender({ tanks: { fresh: okTank }, demo: false })

      expect(resolve).toHaveBeenCalledWith('real-1')
    })

    it('keeps recording real alarms once demo mode is switched off again', () => {
      spyToasts()
      const append = vi.spyOn(alertHistory, 'appendAlertHistoryEntry').mockReturnValue('h1')

      const { rerender } = renderHook(
        ({ tanks, demo }) =>
          useAlertToasts({ tanks, status: 'connected', tailscale: null, enabled: true, demo }),
        { initialProps: { tanks: { fresh: okTank }, demo: true } },
      )
      rerender({ tanks: { fresh: alarmTank }, demo: false })

      expect(append).toHaveBeenCalledTimes(1)
    })
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
