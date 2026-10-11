import type { ReactNode } from 'react'
import { SettingsContext, type SettingsContextValue } from './SettingsContext'

interface SettingsProviderProps {
  /** Built once (memoised) by `App`; tests pass a literal. */
  value: SettingsContextValue
  children: ReactNode
}

export function SettingsProvider({ value, children }: SettingsProviderProps) {
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
