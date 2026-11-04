import { describe, expect, it } from 'vite-plus/test'
import {
  canChangeSettings,
  canStart,
  canStop,
  formatRuntime,
  heaterSensor,
  isReporting,
  modeSwitchBlock,
  OPERATING_MODES,
  operatingMode,
  phaseLabel,
  sensorLocked,
  stepWithin,
} from './heater'

describe('operating mode', () => {
  it('reads fixed power as Power and either sensor as Temperature', () => {
    expect(operatingMode({ mode: 'power' })).toBe('power')
    expect(operatingMode({ mode: 'heater_temperature' })).toBe('temperature')
    expect(operatingMode({ mode: 'external_temperature' })).toBe('temperature')
    expect(operatingMode({})).toBeUndefined()
  })

  it('reads a fan-only heater as Ventilation whatever its stored mode is', () => {
    expect(operatingMode({ mode: 'power', ventilating: true })).toBe('ventilation')
  })

  it('names the sensor only in a temperature mode', () => {
    expect(heaterSensor({ mode: 'external_temperature' })).toBe('external_temperature')
    expect(heaterSensor({ mode: 'power' })).toBeUndefined()
    expect(heaterSensor({})).toBeUndefined()
  })

  it('offers the five Comfort Control modes, only two of them commandable today', () => {
    expect(OPERATING_MODES.map((m) => m.key)).toEqual([
      'power',
      'temperature',
      'thermostat',
      'heat_ventilation',
      'ventilation',
    ])
    expect(OPERATING_MODES.filter((m) => m.supported).map((m) => m.key)).toEqual([
      'power',
      'temperature',
    ])
  })
})

describe('mode switch rules', () => {
  const running = { phase: 'running' } as const
  const off = { phase: 'off' } as const

  it('refuses Ventilation from a heating mode, and a heating mode from Ventilation, while on', () => {
    expect(modeSwitchBlock(running, 'temperature', 'ventilation')).toBeDefined()
    expect(modeSwitchBlock(running, 'thermostat', 'ventilation')).toBeDefined()
    expect(modeSwitchBlock(running, 'ventilation', 'temperature')).toBeDefined()
    expect(modeSwitchBlock(running, 'ventilation', 'power')).toBeDefined()
  })

  it('allows switching between heating modes while on', () => {
    expect(modeSwitchBlock(running, 'temperature', 'power')).toBeUndefined()
    expect(modeSwitchBlock(running, 'power', 'heat_ventilation')).toBeUndefined()
  })

  it('allows every switch with the heater off, and a re-select', () => {
    expect(modeSwitchBlock(off, 'ventilation', 'temperature')).toBeUndefined()
    expect(modeSwitchBlock(off, 'temperature', 'ventilation')).toBeUndefined()
    expect(modeSwitchBlock(running, 'ventilation', 'ventilation')).toBeUndefined()
  })

  it('locks the sensor in the modes that read none', () => {
    expect(sensorLocked('power')).toBe(true)
    expect(sensorLocked('thermostat')).toBe(true)
    expect(sensorLocked('ventilation')).toBe(true)
    expect(sensorLocked('temperature')).toBe(false)
    expect(sensorLocked('heat_ventilation')).toBe(false)
  })
})

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
