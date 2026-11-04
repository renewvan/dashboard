import { writeStorage } from '@/hooks/useStoredState'

/** URL params of this shape are dev flags: `?flag.theme=dark&flag.navbar-position=bottom`. */
const PREFIX = 'flag.'
const STORAGE_PREFIX = 'renewvan-dashboard-'
/** Flags that are not a stored setting: each is read by the code it switches. */
const SESSION_FLAGS: ReadonlySet<string> = new Set(['demo', 'nav-pinned', 'heater-pause'])

/** The raw value of dev flag `name`, or null. Always null outside a dev build, so a kiosk ignores them. */
export function readDevFlag(name: string): string | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(PREFIX + name)
}

/** A boolean dev flag: `true`/`1`, or the bare param. */
export function devFlagOn(name: string): boolean {
  const value = readDevFlag(name)
  return value === '' || value === 'true' || value === '1'
}

/**
 * Dev builds only: writes every `?flag.<name>=<value>` that is a stored setting to localStorage under
 * `renewvan-dashboard-<name>` before React renders, so the hooks read it as if it had been chosen
 * (the same parse that guards a hand-edited value still applies). It persists, so the URL is needed
 * once. Names are the storage key without its prefix: `theme`, `navbar-position`,
 * `settings-nav-style`, `start-view`, `map-theme`, `power-layout`, `alerts-enabled`, ...
 */
export function applyDevFlags(): void {
  if (!import.meta.env.DEV || typeof window === 'undefined') return
  for (const [param, value] of new URLSearchParams(window.location.search)) {
    if (!param.startsWith(PREFIX)) continue
    const name = param.slice(PREFIX.length)
    if (!/^[a-z][a-z-]*$/.test(name) || SESSION_FLAGS.has(name)) continue
    writeStorage(STORAGE_PREFIX + name, value)
  }
}
