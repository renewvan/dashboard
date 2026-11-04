import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { devFlagOn } from '@/lib/devFlags'
import type { Heater, HeaterMode, HeaterPhase } from '@/types'

/** Delay before the simulated heater "answers" a command, so the page's pending state is visible. */
const ANSWER_MS = 500
/** Time spent in each transitional phase. */
const PHASE_MS = 2000

/**
 * Dev-only stand-in for a heater driver while Demo mode is on (hub ADR 0021 keeps the demo heater
 * read-only, so nothing may be published). Commands patch an in-memory overlay on the demo heaters
 * and publish nothing; `commands_enabled` is overlaid to true so the controls can be developed.
 * Inactive (the heaters pass through untouched) unless `enabled`.
 */
export function useSimulatedHeaters(heaters: Record<string, Heater>, enabled: boolean) {
  const [overlay, setOverlay] = useState<Record<string, Partial<Heater>>>({})
  // Paused: the demo's own updates are ignored and the heaters hold the snapshot taken at the pause.
  const [frozen, setFrozen] = useState<Record<string, Heater> | null>(null)
  const timers = useRef<Set<number>>(new Set())

  useEffect(() => {
    const live = timers.current
    return () => {
      for (const handle of live) window.clearTimeout(handle)
      live.clear()
    }
  }, [])
  useEffect(() => {
    if (enabled) return
    for (const handle of timers.current) window.clearTimeout(handle)
    timers.current.clear()
    setOverlay({})
    setFrozen(null)
  }, [enabled])

  // The demo loops through its own phases (hub heater.cabin.demo.json). When one moves on, the
  // demo wins again: drop that heater's overlay so the fault and ventilating steps still show.
  const lastPhase = useRef<Record<string, HeaterPhase | undefined>>({})
  useEffect(() => {
    const changed: string[] = []
    for (const [id, heater] of Object.entries(heaters)) {
      if (id in lastPhase.current && lastPhase.current[id] !== heater.phase) changed.push(id)
      lastPhase.current[id] = heater.phase
    }
    if (changed.length === 0 || frozen) return
    setOverlay((prev) => {
      const next = { ...prev }
      for (const id of changed) delete next[id]
      return next
    })
  }, [heaters, frozen])

  // `?flag.heater-pause=1` starts paused, once the demo heaters have arrived.
  const startedPaused = useRef(false)
  useEffect(() => {
    if (!enabled || startedPaused.current || Object.keys(heaters).length === 0) return
    startedPaused.current = true
    if (devFlagOn('heater-pause')) setFrozen(heaters)
  }, [enabled, heaters])

  const later = useCallback((ms: number, fn: () => void) => {
    const handle = window.setTimeout(() => {
      timers.current.delete(handle)
      fn()
    }, ms)
    timers.current.add(handle)
  }, [])

  const patch = useCallback(
    (id: string, fields: Partial<Heater>) =>
      setOverlay((prev) => ({ ...prev, [id]: { ...prev[id], ...fields } })),
    [],
  )
  const phase = useCallback(
    (id: string, next: HeaterPhase, runtime_s?: number) =>
      patch(id, { phase: next, ...(runtime_s === undefined ? {} : { runtime_s }) }),
    [patch],
  )

  const setRunning = useCallback(
    (id: string, run: boolean) => {
      later(ANSWER_MS, () => {
        if (run) {
          phase(id, 'starting', 0)
          later(PHASE_MS, () => {
            phase(id, 'warming_up')
            later(PHASE_MS, () => phase(id, 'running'))
          })
        } else {
          phase(id, 'shutting_down')
          later(PHASE_MS, () => phase(id, 'off', 0))
        }
      })
    },
    [later, phase],
  )
  const setMode = useCallback(
    (id: string, mode: HeaterMode) => later(ANSWER_MS, () => patch(id, { mode })),
    [later, patch],
  )
  const setSetpoint = useCallback(
    (id: string, celsius: number) => later(ANSWER_MS, () => patch(id, { setpoint_c: celsius })),
    [later, patch],
  )
  const setPowerLevel = useCallback(
    (id: string, level: number) => later(ANSWER_MS, () => patch(id, { power_level: level })),
    [later, patch],
  )

  const simulated = useMemo(() => {
    if (!enabled) return heaters
    const out: Record<string, Heater> = {}
    for (const [id, heater] of Object.entries(frozen ?? heaters)) {
      out[id] = { ...heater, ...overlay[id], commands_enabled: true }
    }
    return out
  }, [enabled, heaters, overlay, frozen])

  /** Pause holds the heaters as they are now; resume hands them back to the demo loop. */
  const togglePause = useCallback(() => {
    if (frozen) {
      setFrozen(null)
      setOverlay({})
    } else {
      setFrozen(simulated)
      setOverlay({})
    }
  }, [frozen, simulated])

  return {
    heaters: simulated,
    paused: frozen !== null,
    togglePause,
    setRunning,
    setMode,
    setSetpoint,
    setPowerLevel,
  }
}
