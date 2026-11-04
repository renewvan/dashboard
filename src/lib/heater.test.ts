import { describe, expect, it } from 'vite-plus/test'
import {
  canChangeSettings,
  canStart,
  canStop,
  formatRuntime,
  isReporting,
  phaseLabel,
  stepWithin,
} from './heater'

describe('heater helpers', () => {
  it('starts only from off with error 0', () => {
    expect(canStart({ phase: 'off', error_code: 0 })).toBe(true)
    expect(canStart({ phase: 'off', error_code: 30 })).toBe(false)
    expect(canStart({ phase: 'off' })).toBe(false)
    expect(canStart({ phase: 'running', error_code: 0 })).toBe(false)
  })

  it('stops from any phase but off, or unknown', () => {
    expect(canStop({ phase: 'running' })).toBe(true)
    expect(canStop({ phase: 'starting' })).toBe(true)
    expect(canStop({ phase: 'off' })).toBe(false)
    expect(canStop({})).toBe(false)
  })

  it('refuses settings while shutting down, ventilating or silent', () => {
    expect(canChangeSettings({ phase: 'running' })).toBe(true)
    expect(canChangeSettings({ phase: 'shutting_down' })).toBe(false)
    expect(canChangeSettings({ phase: 'off', ventilating: true })).toBe(false)
    expect(canChangeSettings({})).toBe(false)
  })

  it('treats a heater with no phase and no code as not reporting', () => {
    expect(isReporting({})).toBe(false)
    expect(isReporting({ status_code: '9.9' })).toBe(true)
    expect(phaseLabel({ status_code: '9.9' })).toBe('Status 9.9')
    expect(phaseLabel({ phase: 'warming_up' })).toBe('Warming up')
    expect(phaseLabel({ phase: 'running', ventilating: true })).toBe('Ventilating')
    expect(phaseLabel({})).toBeUndefined()
  })

  it('steps inside a range and reports no-ops', () => {
    expect(stepWithin(5, 1, { min: 1, max: 30 })).toBe(6)
    expect(stepWithin(30, 1, { min: 1, max: 30 })).toBeUndefined()
    expect(stepWithin(0, -1, { min: 0, max: 9 })).toBeUndefined()
  })

  it('formats runtime', () => {
    expect(formatRuntime(125)).toBe('2 min')
    expect(formatRuntime(7500)).toBe('2 h 05 min')
  })
})
