import type { Tank, TankAlarmDirection } from '../types'

export interface TankAlarmConfig {
  /** `low`: alarm when level drains below the threshold (fresh/fuel).
   *  `high`: alarm when level rises above the threshold (grey/black). */
  direction: TankAlarmDirection
  /** Level % that trips the alarm (red at/past it). */
  threshold: number
  /** Level % that clears the alarm (blue at/past it); the band between
   *  threshold and restore is the amber caution zone. */
  restore: number
}

export type TankAlarmZone = 'danger' | 'caution' | 'normal'

/** Reads a tank's alarm config off the live wire fields (hub schema v0.5:
 *  alarm_direction/alarm_threshold_pct/alarm_restore_pct, retained/static,
 *  published once at startup alongside fluid_type/capacity_l -- see
 *  docs/adr/0004 in hub). Returns undefined if the tank has no alarm
 *  configured (all three fields absent), matching node-tank's own gating. */
export function tankAlarmConfig(tank: Tank): TankAlarmConfig | undefined {
  if (
    tank.alarm_direction === undefined ||
    tank.alarm_threshold_pct === undefined ||
    tank.alarm_restore_pct === undefined
  ) {
    return undefined
  }
  return {
    direction: tank.alarm_direction,
    threshold: tank.alarm_threshold_pct,
    restore: tank.alarm_restore_pct,
  }
}

/**
 * Level-band severity for a tank's liquid fill. Boundary comparisons match
 * node-tank's `_crossed` exactly: entering alarm is inclusive of the
 * threshold (low: `<=`, high: `>=`), restoring is inclusive of the
 * restore level, so the caution zone is the open band between them.
 */
export function tankAlarmZone(levelPct: number, config: TankAlarmConfig): TankAlarmZone {
  if (config.direction === 'low') {
    if (levelPct <= config.threshold) return 'danger'
    return levelPct < config.restore ? 'caution' : 'normal'
  }
  if (levelPct >= config.threshold) return 'danger'
  return levelPct > config.restore ? 'caution' : 'normal'
}

/** Liquid-fill color for a tank card: red while faulted or the bus has a
 *  committed alarm (covers the node's delay holding `alarm` past restore),
 *  else the level band's zone color. */
export function tankLiquidColor(tank: Tank, clampedPct: number): string {
  const config = tankAlarmConfig(tank)
  const zone = config ? tankAlarmZone(clampedPct, config) : 'normal'
  if (tank.status !== 'ok' || tank.alarm_state === 'alarm' || zone === 'danger') {
    return 'var(--bad)'
  }
  return zone === 'caution' ? 'var(--warn)' : 'var(--kiosk-accent)'
}
