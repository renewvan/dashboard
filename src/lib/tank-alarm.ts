import type { Tank } from '../types'

// Dashboard-side mirror of node-tank's per-tank alarm config
// (config.default.ini `[tank.<id>]` alarm_* keys). The wire publishes only
// the committed `alarm_state` (ok/alarm, already hysteresis- and
// delay-debounced by the node) — the threshold/restore band between the
// two is not on the wire, so the card colors it from this table. Keep in
// sync with the node's config when a tank's alarm values change.
//
// Mirrors relayLabels.ts's pattern: `id`-keyed presentation config for a
// field the wire doesn't carry. Tanks without an entry (or with alarm
export interface TankAlarmConfig {
  /** `low`: alarm when level drains below the threshold (fresh/fuel).
   *  `high`: alarm when level rises above the threshold (grey/black). */
  direction: 'low' | 'high'
  /** Level % that trips the alarm (red at/past it). */
  threshold: number
  /** Level % that clears the alarm (blue at/past it); the band between
   *  threshold and restore is the amber caution zone. */
  restore: number
}

export const TANK_ALARM_CONFIGS: Record<string, TankAlarmConfig> = {
  fresh: { direction: 'low', threshold: 20, restore: 25 },
  grey: { direction: 'high', threshold: 90, restore: 80 },
}

export type TankAlarmZone = 'danger' | 'caution' | 'normal'

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
export function tankLiquidColor(id: string, tank: Tank, clampedPct: number): string {
  const config = TANK_ALARM_CONFIGS[id]
  const zone = config ? tankAlarmZone(clampedPct, config) : 'normal'
  if (tank.status !== 'ok' || tank.alarm_state === 'alarm' || zone === 'danger') {
    return 'var(--bad)'
  }
  return zone === 'caution' ? 'var(--warn)' : 'var(--kiosk-accent)'
}
