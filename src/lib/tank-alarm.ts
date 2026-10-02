import { FLUID_COLORS } from './tank-labels'
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

/** Liquid-fill color for a tank card: red while faulted, in the danger
 *  zone, or while the bus holds a committed alarm with no zone info to
 *  say otherwise (config absent, so zone always reads 'normal') --
 *  covers the node's delay holding `alarm` past restore. A caution
 *  zone reading is always amber regardless of the committed-alarm bit:
 *  the hub only clears `alarm_state` once level crosses all the way to
 *  restore, so while recovering from danger the bit stays set for the
 *  whole caution band -- deferring to the zone math (not the coarser
 *  bit) here is what lets amber show while rising, not just falling.
 *  In the normal band, the fill reads as the fluid's own color
 *  (`FLUID_COLORS`) rather than one shared blue, so tanks are
 *  distinguishable by color at a glance; alarm severity always still
 *  wins over it via the caution/danger/committed-alarm checks above. */
export function tankLiquidColor(tank: Tank, clampedPct: number): string {
  const config = tankAlarmConfig(tank)
  const zone = config ? tankAlarmZone(clampedPct, config) : 'normal'
  if (tank.status !== 'ok' || zone === 'danger') return 'var(--bad)'
  if (zone === 'caution') return 'var(--warn)'
  return tank.alarm_state === 'alarm' ? 'var(--bad)' : FLUID_COLORS[tank.fluid_type]
}

export type TankLevelSeverity = 'success' | 'warning' | 'error' | 'info' | 'destructive'

/** Maps a `TankLevelSeverity` to the raw CSS color the Status row paints
 *  its text with (an inline style, not a Badge variant class -- see
 *  `TankCard`). Mirrors the same semantic palette `tankLiquidColor`
 *  paints the liquid fill with, so a tank's Status row text and its
 *  gauge color always read as the same severity. */
export const TANK_SEVERITY_COLOR: Record<TankLevelSeverity, string> = {
  success: 'var(--ok)',
  warning: 'var(--warn)',
  error: 'var(--bad)',
  info: 'var(--accent)',
  destructive: 'var(--bad)',
}

export interface TankLevelStatus {
  /** Camper-worded level state: 'Full'/'Empty'/'Normal' at the 100%/0%/
   *  between marks, else the direction-worded name of whichever band
   *  it's left the normal range into ('Low' for a low-direction tank
   *  draining toward/past threshold, 'High' for a high-direction tank
   *  filling toward/past it) -- covers both the amber caution band and
   *  the red danger band under the same word, distinguished only by
   *  `color`. */
  label: 'Full' | 'Empty' | 'Normal' | 'Low' | 'High'
  color: TankLevelSeverity
}

/** The tank card's level-zone severity: feeds both the header Badge and
 *  the "Status" telemetry row (same value, same color, by design -- a
 *  tank reading Full should never show green in one place and red in
 *  the other). Reuses `tankAlarmZone`'s existing threshold/restore math
 *  rather than publishing a redundant wire field for it (docs/adr/0003's
 *  mirror-vs-wire tradeoff, resolved the same way here: the zone is
 *  already fully derivable from fields already on the wire, so a
 *  second copy of the same computation risks drift for no new
 *  capability). 'Full'/'Empty' at the 100%/0% marks carry whatever
 *  severity the zone math already assigns there: a low-direction
 *  tank's danger zone sits at the bottom, so 0% reads Empty/error and
 *  100% (deep in its normal zone) reads Full/success; a high-direction
 *  tank is the mirror image (0%=Empty/success, 100%=Full/error).
 *  Compares the *rounded* level, matching the `pct.toFixed(0)` the
 *  card actually displays -- a raw reading like 0.3% still displays as
 *  "0%", so it must read Empty here too, not fall through to Low on an
 *  exact-zero check the sensor will rarely ever hit. A committed
 *  alarm_state holds red past restore (mirrors `tankLiquidColor`'s own
 *  override, for the same node-side delay) but never overrides a
 *  caution reading, which the zone math already places more precisely
 *  than the coarser bit. Returns undefined for a tank with no alarm
 *  configured -- there's no meaningful severity to report, so the
 *  header falls back to its own plain Normal/Fault badge and the
 *  Status row hides entirely (see TankCard). */
export function tankLevelStatus(tank: Tank, levelPct: number): TankLevelStatus | undefined {
  const config = tankAlarmConfig(tank)
  if (!config) return undefined
  const zone = tankAlarmZone(levelPct, config)
  const committedAlarm = tank.alarm_state === 'alarm'
  const base: TankLevelStatus =
    zone === 'normal' && !committedAlarm
      ? { label: 'Normal', color: 'info' }
      : {
          label: config.direction === 'low' ? 'Low' : 'High',
          color: zone === 'caution' ? 'warning' : 'destructive',
        }
  const rounded = Math.round(levelPct)
  if (rounded === 0)
    return { label: 'Empty', color: config.direction === 'low' ? 'destructive' : 'success' }
  if (rounded === 100)
    return { label: 'Full', color: config.direction === 'low' ? 'success' : 'destructive' }
  return base
}
