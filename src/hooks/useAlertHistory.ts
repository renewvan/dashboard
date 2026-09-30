import { useEffect, useState } from 'react'
import {
  acknowledgeAlertHistoryEntry,
  getAlertHistory,
  removeAlertHistoryEntry,
  subscribeAlertHistory,
  type AlertHistoryEntry,
} from '../lib/alertHistory'

export interface UseAlertHistoryResult {
  entries: AlertHistoryEntry[]
  /** Removes one entry from the persistent log — the Alerts tab's own explicit dismiss, distinct from a toast's ephemeral close. */
  remove: (id: string) => void
  /** Marks one entry acknowledged — a separate, explicit driver action from resolving. */
  acknowledge: (id: string) => void
}

/** Reactive wrapper around `lib/alertHistory.ts`'s module-level store, for `AlertsTab`. */
export function useAlertHistory(): UseAlertHistoryResult {
  const [entries, setEntries] = useState<AlertHistoryEntry[]>(() => getAlertHistory())

  useEffect(() => subscribeAlertHistory(() => setEntries(getAlertHistory())), [])

  return { entries, remove: removeAlertHistoryEntry, acknowledge: acknowledgeAlertHistoryEntry }
}
