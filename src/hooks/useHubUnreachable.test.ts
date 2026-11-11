import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { isKioskHost, UNREACHABLE_AFTER_MS, useHubUnreachable } from './useHubUnreachable'
import type { ConnectionStatus } from './useRenewvanBus'

describe('useHubUnreachable', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms))

  it('stays false through a short reconnect blip', () => {
    const { result, rerender } = renderHook(({ s }) => useHubUnreachable(s), {
      initialProps: { s: 'connected' as ConnectionStatus },
    })
    rerender({ s: 'disconnected' })
    wait(UNREACHABLE_AFTER_MS - 1)
    expect(result.current).toBe(false)
    rerender({ s: 'connected' })
    wait(UNREACHABLE_AFTER_MS)
    expect(result.current).toBe(false)
  })

  it('turns true once the link has been down for the whole delay, and clears on connect', () => {
    const { result, rerender } = renderHook(({ s }) => useHubUnreachable(s), {
      initialProps: { s: 'connecting' as ConnectionStatus },
    })
    wait(UNREACHABLE_AFTER_MS)
    expect(result.current).toBe(true)
    rerender({ s: 'connected' })
    expect(result.current).toBe(false)
  })

  it('is always false when disabled (Demo mode, kiosk)', () => {
    const { result } = renderHook(() => useHubUnreachable('disconnected', false))
    wait(UNREACHABLE_AFTER_MS * 2)
    expect(result.current).toBe(false)
  })

  it('knows the kiosk host', () => {
    expect(isKioskHost('localhost')).toBe(true)
    expect(isKioskHost('127.0.0.1')).toBe(true)
    expect(isKioskHost('192.168.1.50')).toBe(false)
    expect(isKioskHost('pi.tail1234.ts.net')).toBe(false)
  })
})
