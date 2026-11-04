import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import type { Heater } from '@/types'
import { useSimulatedHeaters } from './useSimulatedHeaters'

const heaters: Record<string, Heater> = {
  h1: {
    phase: 'off',
    error_code: 0,
    setpoint_c: 20,
    mode: 'heater_temperature',
    commands_enabled: false,
  },
}

describe('useSimulatedHeaters', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('passes heaters through untouched when disabled', () => {
    const { result } = renderHook(() => useSimulatedHeaters(heaters, false))
    expect(result.current.heaters).toBe(heaters)
  })

  it('enables commands and walks a start through the phases', () => {
    const { result } = renderHook(() => useSimulatedHeaters(heaters, true))
    expect(result.current.heaters.h1.commands_enabled).toBe(true)
    act(() => result.current.setRunning('h1', true))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.h1.phase).toBe('starting')
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current.heaters.h1.phase).toBe('warming_up')
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current.heaters.h1.phase).toBe('running')
    act(() => result.current.setRunning('h1', false))
    act(() => void vi.advanceTimersByTime(2500))
    expect(result.current.heaters.h1.phase).toBe('off')
  })

  it('applies setpoint, mode and power level', () => {
    const { result } = renderHook(() => useSimulatedHeaters(heaters, true))
    act(() => {
      result.current.setSetpoint('h1', 23)
      result.current.setMode('h1', 'power')
      result.current.setPowerLevel('h1', 5)
    })
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.h1).toMatchObject({
      setpoint_c: 23,
      mode: 'power',
      power_level: 5,
    })
  })

  it('drops the overlay when the demo moves to its next phase', () => {
    const { result, rerender } = renderHook(({ h }) => useSimulatedHeaters(h, true), {
      initialProps: { h: heaters },
    })
    act(() => result.current.setSetpoint('h1', 25))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.h1.setpoint_c).toBe(25)
    rerender({ h: { h1: { ...heaters.h1, phase: 'starting' } } })
    expect(result.current.heaters.h1.setpoint_c).toBe(20)
    expect(result.current.heaters.h1.phase).toBe('starting')
  })

  it('holds the heaters while paused and rejoins the demo on resume', () => {
    const { result, rerender } = renderHook(({ h }) => useSimulatedHeaters(h, true), {
      initialProps: { h: heaters },
    })
    act(() => result.current.setSetpoint('h1', 25))
    act(() => void vi.advanceTimersByTime(500))
    act(() => result.current.togglePause())
    expect(result.current.paused).toBe(true)
    rerender({ h: { h1: { ...heaters.h1, phase: 'running' } } })
    expect(result.current.heaters.h1).toMatchObject({ phase: 'off', setpoint_c: 25 })
    act(() => result.current.setRunning('h1', true))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.h1.phase).toBe('starting')
    act(() => result.current.togglePause())
    expect(result.current.paused).toBe(false)
    expect(result.current.heaters.h1.phase).toBe('running')
  })
})
