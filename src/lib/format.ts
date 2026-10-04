/**
 * Presentation formatting shared between the header uplink popover and
 * SettingsTab's Network subpage — one formatter per unit, not two
 * independently-drifting copies (tailscaleStatusText precedent).
 */

/** 1024-based byte scale, one decimal from KB up — matches the popover's
 * established `↓ 385.1 MB` reading. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit += 1
  } while (value >= 1024 && unit < units.length - 1)
  return `${value.toFixed(1)} ${units[unit]}`
}

/** Coarse router uptime: the two most significant units only
 * (`9d 13h`, `5h 12m`, `3m 20s`, `42s`) — kiosk-glance precision, not a
 * stopwatch. */
export function formatUptime(totalSeconds: number): string {
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}
