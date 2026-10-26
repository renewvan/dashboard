import { sortTankIds } from '@/lib/tank-display'
import { isCompleteTank } from '@/types'
import { useSettingsData } from '../SettingsContext'

/** Ids of the tanks that have fully reported, in display order (fresh, grey, then by id). */
export function useReportedTankIds(): string[] {
  const { tanks } = useSettingsData()
  return sortTankIds(Object.keys(tanks).filter((id) => isCompleteTank(tanks[id])))
}
