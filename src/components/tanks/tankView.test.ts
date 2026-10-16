import { describe, expect, it } from 'vite-plus/test'
import type { Tank } from '@/types'
import { tankView } from './tankView'

function tank(overrides: Partial<Tank> = {}): Tank {
  return {
    fluid_type: 'fresh_water',
    capacity_l: 100,
    level_pct: 62,
    status: 'ok',
    volume_since_full_l: 0,
    volume_since_empty_l: 0,
    ...overrides,
  }
}

const NOW = new Date('2026-07-14T12:00:00Z')
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3_600_000).toISOString()

const LOW_ALARM = {
  alarm_direction: 'low' as const,
  alarm_threshold_pct: 27,
  alarm_restore_pct: 48,
}

describe('tankView', () => {
  it('clamps the level into 0..100 and rounds the litres from the raw level', () => {
    expect(tankView(tank({ level_pct: 140 }), NOW).pct).toBe(100)
    expect(tankView(tank({ level_pct: -5 }), NOW).pct).toBe(0)
    expect(tankView(tank({ level_pct: 62, capacity_l: 80 }), NOW).litres).toBe(50)
  })

  it('shows a plain Normal badge and no Status row for a tank with no alarm configured', () => {
    const view = tankView(tank(), NOW)
    expect(view.badge).toEqual({ label: 'Normal', severity: 'accent' })
    expect(view.status).toBeUndefined()
  })

  it('shows the same word and severity in the badge and the Status row', () => {
    const view = tankView(tank({ ...LOW_ALARM, level_pct: 100 }), NOW)
    expect(view.badge).toEqual({ label: 'Full', severity: 'success' })
    expect(view.status).toEqual(view.badge)
  })

  it('words the Status by alarm direction and zone', () => {
    expect(tankView(tank({ ...LOW_ALARM, level_pct: 15 }), NOW).status).toEqual({
      label: 'Low',
      severity: 'danger',
    })
    expect(tankView(tank({ ...LOW_ALARM, level_pct: 35 }), NOW).status).toEqual({
      label: 'Low',
      severity: 'warning',
    })
  })

  it('shows a danger-severity Fault badge and the fault reason in the Status row, with an empty gauge', () => {
    const view = tankView(tank({ status: 'open_circuit', level_pct: 95 }), NOW)
    expect(view.badge).toEqual({ label: 'Fault', severity: 'danger' })
    expect(view.status).toEqual({ label: 'Open circuit', severity: 'danger' })
    expect(view.pct).toBe(0)
    expect(view.faulted).toBe(true)
    expect(tankView(tank({ status: 'short_circuit' }), NOW).status?.label).toBe('Short circuit')
  })

  it('keeps a committed alarm danger past the restore level, with no zone to contradict it', () => {
    const view = tankView(tank({ alarm_state: 'alarm', level_pct: 62 }), NOW)
    expect(view.severity).toBe('danger')
  })

  it('uses one fill severity for the gauge: accent normally, danger/warning in the zones', () => {
    expect(tankView(tank(), NOW).severity).toBe('accent')
    expect(tankView(tank({ ...LOW_ALARM, level_pct: 35 }), NOW).severity).toBe('warning')
    expect(tankView(tank({ ...LOW_ALARM, level_pct: 20 }), NOW).severity).toBe('danger')
  })

  it('shows Temperature with a dash when the tank has no sensor, not 0', () => {
    expect(tankView(tank(), NOW).temperature).toBe('--')
    expect(tankView(tank({ temperature_c: 18.4 }), NOW).temperature).toBe('18°C')
  })

  it('reads fresh water as Drain Rate since the last refill', () => {
    const view = tankView(
      tank({ volume_since_full_l: 20, volume_since_empty_l: 999, last_full_at: hoursAgo(10) }),
      NOW,
    )
    expect(view.rateLabel).toBe('Drain Rate')
    expect(view.rate).toBe('2.0 L/h')
    expect(view.footerLabel).toBe('Last refilled')
  })

  it('reads every other tank as Fill Rate since the last empty-out', () => {
    const view = tankView(
      tank({
        fluid_type: 'grey_water',
        volume_since_full_l: 999,
        volume_since_empty_l: 15,
        last_empty_at: hoursAgo(5),
      }),
      NOW,
    )
    expect(view.rateLabel).toBe('Fill Rate')
    expect(view.rate).toBe('3.0 L/h')
    expect(view.footerLabel).toBe('Last emptied')
  })

  it('shows a dash for the rate before any latch, and for the first minute after one', () => {
    expect(tankView(tank(), NOW).rate).toBe('--')
    const fresh = new Date(NOW.getTime() - 30_000).toISOString()
    expect(tankView(tank({ volume_since_full_l: 3, last_full_at: fresh }), NOW).rate).toBe('--')
  })

  it('shows the latch date in the fixed format, and a dash when there is none', () => {
    const local = new Date(2026, 6, 14, 9, 41)
    expect(tankView(tank({ last_full_at: local.toISOString() }), NOW).footerDate).toBe(
      '14 Jul 2026 09:41',
    )
    expect(tankView(tank(), NOW).footerDate).toBe('—')
  })

  it('does not take the refill date for a grey tank, nor the empty date for fresh water', () => {
    const local = new Date(2026, 6, 14, 9, 41).toISOString()
    expect(tankView(tank({ last_empty_at: local }), NOW).footerDate).toBe('—')
    expect(tankView(tank({ fluid_type: 'grey_water', last_full_at: local }), NOW).footerDate).toBe(
      '—',
    )
  })
})
