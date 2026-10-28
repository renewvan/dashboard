import { describe, expect, it } from 'vite-plus/test'
import type { Battery } from '@/types'
import { bmsAlert } from './bmsAlert'

const core = { soc_pct: 80, voltage_v: 13.2, current_a: 1, power_w: 13 }
const withProtections = (protections: unknown[]) => ({ ...core, protections }) as Partial<Battery>

describe('bmsAlert', () => {
  it('shows nothing while protections are absent or empty', () => {
    expect(bmsAlert(core)).toBeUndefined()
    expect(bmsAlert({ ...core, protections: [] })).toBeUndefined()
    expect(bmsAlert(undefined)).toBeUndefined()
  })

  it('never reads the allow flags', () => {
    expect(bmsAlert({ ...core, allow_charge: false, allow_discharge: false })).toBeUndefined()
  })

  it('is amber for the charge-side and maintenance protections', () => {
    for (const name of [
      'cell_imbalance',
      'charge_overtemperature',
      'charge_undertemperature',
      'charge_overcurrent',
    ]) {
      expect(bmsAlert(withProtections([name]))?.tone).toBe('warning')
    }
  })

  it('is danger for every other protection, including other and unrecognised names', () => {
    for (const name of [
      'short_circuit',
      'locked',
      'cell_undervoltage',
      'other',
      'from_the_future',
    ]) {
      expect(bmsAlert(withProtections([name]))?.tone).toBe('danger')
    }
  })

  it('takes the colour of the worst active protection and names them all', () => {
    expect(bmsAlert(withProtections(['cell_imbalance', 'short_circuit']))).toEqual({
      tone: 'danger',
      names: ['Cell imbalance', 'Short circuit'],
    })
    expect(bmsAlert(withProtections(['cell_imbalance']))).toEqual({
      tone: 'warning',
      names: ['Cell imbalance'],
    })
  })
})
