import { useEffect, useState } from 'react'
import {
  getAlertHistory,
  removeAlertHistoryEntry,
  subscribeAlertHistory,
  type AlertHistoryEntry,
} from '../lib/alertHistory'

export interface UseAlertHistoryResult {
  entries: AlertHistoryEntry[]
  /** Removes one entry from the persistent log — the Alerts tab's own explicit dismiss, distinct from a toast's ephemeral close. */
  remove: (id: string) => void
}

/** Reactive wrapper around `lib/alertHistory.ts`'s module-level store, for `AlertsTab`. */
export function useAlertHistory(): UseAlertHistoryResult {
  const [entries, setEntries] = useState<AlertHistoryEntry[]>(() => getAlertHistory())

  useEffect(() => subscribeAlertHistory(() => setEntries(getAlertHistory())), [])

  return { entries, remove: removeAlertHistoryEntry }
}
