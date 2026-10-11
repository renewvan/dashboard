import type { Tank, TankAlarmDirection } from '@/types'

export interface TankAlarmConfig {
  /** `low`: alarm when level drains below the threshold (fresh/fuel).
   *  `high`: alarm when level rises above the threshold (grey/black). */
  direction: TankAlarmDirection
  /** Level % that trips the alarm (the danger zone at/past it). */
  threshold: number
  /** Level % that clears the alarm (the normal zone at/past it); the band
   *  between threshold and restore is the caution zone. */
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
 * Level-band severity for a tank's gauge fill. Boundary comparisons match
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

/** Semantic severity of a tank: the one key both the badge and the fill are
 *  painted from, so they cannot disagree. `danger`/`warning` are the alarm
 *  zones, `success` marks a good extreme (see `tankLevelStatus`), `accent`
 *  is the normal band. The component maps a key to a colour; this module
 *  never names one. */
export type TankSeverity = 'danger' | 'warning' | 'success' | 'accent'

/** Severity of a tank's liquid fill: `danger` while faulted, in the danger
 *  zone, or while the bus holds a committed alarm with no zone info to
 *  say otherwise (config absent, so zone always reads 'normal') --
 *  covers the node's delay holding `alarm` past restore. A caution
 *  zone reading is always `warning` regardless of the committed-alarm bit:
 *  the hub only clears `alarm_state` once level crosses all the way to
 *  restore, so while recovering from danger the bit stays set for the
 *  whole caution band -- deferring to the zone math (not the coarser
 *  bit) here is what lets caution show while rising, not just falling.
 *  Everything else is `accent`, whatever the fluid: colour means severity
 *  and nothing else. */
export function tankSeverity(tank: Tank, clampedPct: number): TankSeverity {
  const config = tankAlarmConfig(tank)
  const zone = config ? tankAlarmZone(clampedPct, config) : 'normal'
  if (tank.status !== 'ok' || zone === 'danger') return 'danger'
  if (zone === 'caution') return 'warning'
  return tank.alarm_state === 'alarm' ? 'danger' : 'accent'
}

export interface TankLevelStatus {
  /** Camper-worded level state: 'Full'/'Empty'/'Normal' at the 100%/0%/
   *  between marks, else the direction-worded name of whichever band
   *  it's left the normal range into ('Low' for a low-direction tank
   *  draining toward/past threshold, 'High' for a high-direction tank
   *  filling toward/past it) -- covers both the caution band and the
   *  danger band under the same word, distinguished only by `color`. */
  label: 'Full' | 'Empty' | 'Normal' | 'Low' | 'High'
  color: TankSeverity
}

/** The tank card's level-zone severity: feeds both the header badge and
 *  the "Status" telemetry row (same value, same colour, by design -- a
 *  tank reading Full should never show green in one place and red in
 *  the other). Reuses `tankAlarmZone`'s existing threshold/restore math
 *  rather than publishing a redundant wire field for it (docs/adr/0003's
 *  mirror-vs-wire tradeoff, resolved the same way here: the zone is
 *  already fully derivable from fields already on the wire, so a
 *  second copy of the same computation risks drift for no new
 *  capability). 'Full'/'Empty' at the 100%/0% marks carry whatever
 *  severity the zone math already assigns there: a low-direction
 *  tank's danger zone sits at the bottom, so 0% reads Empty/danger and
 *  100% (deep in its normal zone) reads Full/success; a high-direction
 *  tank is the mirror image (0%=Empty/success, 100%=Full/danger).
 *  Compares the *rounded* level, matching the `pct.toFixed(0)` the
 *  card actually displays -- a raw reading like 0.3% still displays as
 *  "0%", so it must read Empty here too, not fall through to Low on an
 *  exact-zero check the sensor will rarely ever hit. A committed
 *  alarm_state holds danger past restore (mirrors `tankSeverity`'s own
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
      ? { label: 'Normal', color: 'accent' }
      : {
          label: config.direction === 'low' ? 'Low' : 'High',
          color: zone === 'caution' ? 'warning' : 'danger',
        }
  const rounded = Math.round(levelPct)
  if (rounded === 0)
    return { label: 'Empty', color: config.direction === 'low' ? 'danger' : 'success' }
  if (rounded === 100)
    return { label: 'Full', color: config.direction === 'low' ? 'success' : 'danger' }
  return base
}
