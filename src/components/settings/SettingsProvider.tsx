import type { ReactNode } from 'react'
import { useShallowStable } from '@/hooks/useStable'
import {
  SettingsActionsContext,
  SettingsDataContext,
  SettingsPreferencesContext,
  type SettingsActions,
  type SettingsData,
  type SettingsPreferences,
} from './SettingsContext'

interface SettingsProviderProps {
  /** Built each render by `App`; tests pass literals. */
  data: SettingsData
  preferences: SettingsPreferences
  actions: SettingsActions
  children: ReactNode
}

export function SettingsProvider({ data, preferences, actions, children }: SettingsProviderProps) {
  // Each slice keeps its reference until one of its own fields changes.
  const stableData = useShallowStable(data)
  const stablePreferences = useShallowStable(preferences)
  const stableActions = useShallowStable(actions)
  return (
    <SettingsActionsContext.Provider value={stableActions}>
      <SettingsPreferencesContext.Provider value={stablePreferences}>
        <SettingsDataContext.Provider value={stableData}>{children}</SettingsDataContext.Provider>
      </SettingsPreferencesContext.Provider>
    </SettingsActionsContext.Provider>
  )
}
