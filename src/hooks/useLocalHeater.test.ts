import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { useLocalHeater } from './useLocalHeater'

describe('useLocalHeater', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('offers no heater when disabled', () => {
    const { result } = renderHook(() => useLocalHeater(false))
    expect(result.current.heaters).toEqual({})
  })

  it('starts as an off heater with commands enabled', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    expect(result.current.heaters.cabin).toMatchObject({ phase: 'off', commands_enabled: true })
  })

  it('walks a start through the phases and a stop through shutting down', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    act(() => result.current.setRunning('cabin', true))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.cabin.phase).toBe('starting')
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current.heaters.cabin.phase).toBe('warming_up')
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current.heaters.cabin.phase).toBe('running')
    act(() => result.current.setRunning('cabin', false))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.cabin.phase).toBe('shutting_down')
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current.heaters.cabin.phase).toBe('off')
  })

  it('keeps the operating modes the hub cannot carry, and maps the two it can', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    act(() => result.current.setOperatingMode('thermostat', 'heater_temperature'))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.operating).toBe('thermostat')
    expect(result.current.heaters.cabin.mode).toBe('heater_temperature')
    act(() => result.current.setOperatingMode('power', 'heater_temperature'))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.cabin.mode).toBe('power')
    act(() => result.current.setOperatingMode('temperature', 'external_temperature'))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.cabin.mode).toBe('external_temperature')
  })

  it('counts down an armed timer from the start and stops the heater at zero', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    act(() => result.current.setTimerMinutes(30))
    expect(result.current.timerMinutes).toBe(30)
    expect(result.current.endsAt).toBeUndefined()
    act(() => result.current.setRunning('cabin', true))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.endsAt).toBeDefined()
    act(() => void vi.advanceTimersByTime(5000))
    expect(result.current.heaters.cabin.phase).toBe('running')
    // 30 min after the start answered (0.5 s), 5.5 s have passed: the countdown ends now.
    act(() => void vi.advanceTimersByTime(30 * 60_000 - 5000))
    expect(result.current.heaters.cabin.phase).toBe('shutting_down')
    expect(result.current.endsAt).toBeUndefined()
    act(() => void vi.advanceTimersByTime(2000))
    expect(result.current.heaters.cabin.phase).toBe('off')
    // The armed duration stays for the next start.
    expect(result.current.timerMinutes).toBe(30)
  })

  it('arms from now while running, and Off or a Stop cancels the countdown', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    act(() => result.current.setRunning('cabin', true))
    act(() => void vi.advanceTimersByTime(5000))
    act(() => result.current.setTimerMinutes(60))
    expect(result.current.endsAt).toBeDefined()
    act(() => result.current.setTimerMinutes(0))
    expect(result.current.endsAt).toBeUndefined()
    act(() => result.current.setTimerMinutes(30))
    act(() => result.current.setRunning('cabin', false))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.endsAt).toBeUndefined()
  })

  it('starts the heater when an On-in timer reaches zero, without arming a stop', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    act(() => result.current.setTimerKind('on'))
    act(() => result.current.setTimerMinutes(10))
    // The countdown is the start's, and the heater is still off.
    expect(result.current.timerKind).toBe('on')
    expect(result.current.endsAt).toBeDefined()
    expect(result.current.heaters.cabin.phase).toBe('off')
    act(() => void vi.advanceTimersByTime(10 * 60_000))
    expect(result.current.heaters.cabin.phase).toBe('starting')
    // It ran: no pending countdown, and it keeps running (On in sets no stop).
    expect(result.current.endsAt).toBeUndefined()
    act(() => void vi.advanceTimersByTime(60 * 60_000))
    expect(result.current.heaters.cabin.phase).toBe('running')
  })

  it('cancels a pending On-in countdown on a manual start or when the time goes back to 0', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    act(() => result.current.setTimerKind('on'))
    act(() => result.current.setTimerMinutes(10))
    act(() => result.current.setTimerMinutes(0))
    expect(result.current.endsAt).toBeUndefined()
    act(() => result.current.setTimerMinutes(10))
    act(() => result.current.setRunning('cabin', true))
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.endsAt).toBeUndefined()
  })

  it('applies setpoint, mode and power level', () => {
    const { result } = renderHook(() => useLocalHeater(true))
    act(() => {
      result.current.setSetpoint('cabin', 23)
      result.current.setMode('cabin', 'power')
      result.current.setPowerLevel('cabin', 5)
    })
    act(() => void vi.advanceTimersByTime(500))
    expect(result.current.heaters.cabin).toMatchObject({
      setpoint_c: 23,
      mode: 'power',
      power_level: 5,
    })
  })
})
