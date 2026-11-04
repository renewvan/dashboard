import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { HeaterSensor, OperatingMode } from '@/lib/heater'
import type { Heater, HeaterMode, HeaterPhase } from '@/types'

/** Delay before the local heater "answers" a command, so the page's pending state is visible. */
const ANSWER_MS = 500
/** Time spent in each transitional phase. */
const PHASE_MS = 2000

/** A cabin heater that is off and ready, with commands on, so every control can be worked on. */
const INITIAL: Heater = {
  name: 'Cabin heater (local)',
  phase: 'off',
  status_code: '0.1',
  error_code: 0,
  internal_temperature_c: 19.4,
  heater_temperature_c: 24,
  voltage_v: 12.4,
  fan_rpm: 0,
  fuel_pump_hz: 0,
  runtime_s: 0,
  mode: 'heater_temperature',
  setpoint_c: 21,
  power_level: 4,
  commands_enabled: true,
}

/**
 * Dev-only local heater for the Heater page (`?flag.heater-dev=1`): it does not need the hub, the
 * driver or Demo mode. Commands change an in-memory heater and publish nothing; a start walks
 * through the phases and a stop through shutting down, like the real heater.
 */
export function useLocalHeater(enabled: boolean) {
  const [heater, setHeater] = useState<Heater>(INITIAL)
  // The hub has no field for the modes beyond Power and Temperature, so the local heater keeps its own.
  const [operating, setOperating] = useState<OperatingMode>('temperature')
  const timers = useRef<Set<number>>(new Set())

  useEffect(() => {
    const live = timers.current
    return () => {
      for (const handle of live) window.clearTimeout(handle)
      live.clear()
    }
  }, [])

  const later = useCallback((ms: number, fn: () => void) => {
    const handle = window.setTimeout(() => {
      timers.current.delete(handle)
      fn()
    }, ms)
    timers.current.add(handle)
  }, [])

  const patch = useCallback(
    (fields: Partial<Heater>) => setHeater((prev) => ({ ...prev, ...fields })),
    [],
  )
  const phase = useCallback(
    (next: HeaterPhase, runtime_s?: number) =>
      patch({ phase: next, ...(runtime_s === undefined ? {} : { runtime_s }) }),
    [patch],
  )

  const setRunning = useCallback(
    (_id: string, run: boolean) => {
      later(ANSWER_MS, () => {
        if (run) {
          phase('starting', 0)
          later(PHASE_MS, () => {
            phase('warming_up')
            later(PHASE_MS, () => phase('running'))
          })
        } else {
          phase('shutting_down')
          later(PHASE_MS, () => phase('off', 0))
        }
      })
    },
    [later, phase],
  )
  const setMode = useCallback(
    (_id: string, mode: HeaterMode) => later(ANSWER_MS, () => patch({ mode })),
    [later, patch],
  )
  const setOperatingMode = useCallback(
    (next: OperatingMode, sensor: HeaterSensor) =>
      later(ANSWER_MS, () => {
        setOperating(next)
        // Power and Temperature are the hub's `mode`; the others leave it where it was.
        if (next === 'power') patch({ mode: 'power' })
        if (next === 'temperature') patch({ mode: sensor })
      }),
    [later, patch],
  )
  const setSetpoint = useCallback(
    (_id: string, celsius: number) => later(ANSWER_MS, () => patch({ setpoint_c: celsius })),
    [later, patch],
  )
  const setPowerLevel = useCallback(
    (_id: string, level: number) => later(ANSWER_MS, () => patch({ power_level: level })),
    [later, patch],
  )

  const heaters = useMemo(() => {
    const out: Record<string, Heater> = {}
    if (enabled) out.cabin = heater
    return out
  }, [enabled, heater])
  return { heaters, operating, setOperatingMode, setRunning, setMode, setSetpoint, setPowerLevel }
}
