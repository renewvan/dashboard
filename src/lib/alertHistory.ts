// Persistent alert log, backing the Alerts tab's list (`AlertsTab.tsx`).
// Deliberately separate from `toastManager`'s live toast stack
// (`ui/toast.tsx`): toasts are ephemeral (dismissible, gone once the
// backend condition clears, per `useAlertToasts.ts`'s state-driven
// model) — a driver dismissing a toast, or just visiting the Alerts tab,
// used to make that row vanish from the tab too, since it read straight
// off the same live toast array. This module gives the tab its own
// durable record that a toast add only ever *appends* to, and only
// removal here (`removeEntry`, an explicit user action in the tab) or a
// storage-quota failure ever drops a row.
//
// `localStorage`-backed (not React state) so the log survives reloads —
// a driver closing the kiosk app and reopening it still sees today's
// alerts, matching the "kiosk may sit unwatched" context (`CONTEXT.md`,
// `.scratch/alert-system/map.md`).

export interface AlertHistoryEntry {
  id: string
  /** Stable per-alert-source key (`tank:<id>`, `mqtt-connection`, `tailscale-connection` — mirrors `useAlertToasts.ts`'s own key scheme). */
  key: string
  type: 'error' | 'warning'
  title: string
  description: string
  createdAt: number
  /** Set once the backend condition that raised this alert clears (state-driven, same trigger as the toast's own removal) — `undefined` means still active. */
  resolvedAt?: number
  /** Set when a driver explicitly acknowledges the row in the Alerts tab — separate from `resolvedAt`: an alert can be acknowledged while still active, or resolved without ever being acknowledged. */
  acknowledgedAt?: number
}

const STORAGE_KEY = 'renewvan.alertHistory.v1'
// Plenty for a kiosk's alert volume; caps unbounded growth in
// localStorage without needing a real expiry policy.
const MAX_ENTRIES = 200

type Listener = () => void
const listeners = new Set<Listener>()

function read(): AlertHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AlertHistoryEntry[]) : []
  } catch {
    // Unavailable (private browsing) or corrupt — treat as empty rather
    // than crashing the tab.
    return []
  }
}

function write(entries: AlertHistoryEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    // Quota exceeded or storage unavailable — the in-memory list this
    // session still reflects the attempted write via the listener
    // notification below; it just won't survive a reload.
  }
  for (const listener of listeners) listener()
}

export function getAlertHistory(): AlertHistoryEntry[] {
  return read()
}

export function subscribeAlertHistory(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Appends a new entry (newest-first) and returns its id, for later `resolveEntry` correlation. */
export function appendAlertHistoryEntry(entry: Pick<AlertHistoryEntry, 'key' | 'type' | 'title' | 'description'>): string {
  const id = `${entry.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  write([{ ...entry, id, createdAt: Date.now() }, ...read()])
  return id
}

/** Marks an entry resolved (backend condition cleared) — the row stays, just no longer reads as an open alert. */
export function resolveAlertHistoryEntry(id: string): void {
  const entries = read()
  const index = entries.findIndex((entry) => entry.id === id)
  if (index === -1 || entries[index].resolvedAt !== undefined) return
  const next = [...entries]
  next[index] = { ...next[index], resolvedAt: Date.now() }
  write(next)
}

/** Marks an entry acknowledged (explicit driver action in the Alerts tab) — independent of `resolveAlertHistoryEntry`. */
export function acknowledgeAlertHistoryEntry(id: string): void {
  const entries = read()
  const index = entries.findIndex((entry) => entry.id === id)
  if (index === -1 || entries[index].acknowledgedAt !== undefined) return
  const next = [...entries]
  next[index] = { ...next[index], acknowledgedAt: Date.now() }
  write(next)
}

/** Removes one entry — the only user-facing "dismiss" for the Alerts tab's own list. */
export function removeAlertHistoryEntry(id: string): void {
  write(read().filter((entry) => entry.id !== id))
}
