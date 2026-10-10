import { createContext, useContext } from 'react'
import type {
  AutoSleepTimeoutMinutes,
  ConnectionStatus,
  RouterHealth,
  TailscaleStatus,
} from '@/hooks/useRenewvanBus'
import type { NodeSummary } from '@/lib/nodes'
import type { Router, TemperatureSensor } from '@/types'

/**
 * Everything the Settings tab and its views read, built once by `App` from
 * its single hook instances. `temperatures` and `router` are `Partial` because
 * the bus accumulates entities one property per retained message.
 */
export interface SettingsContextValue {
  nodes: NodeSummary[]
  temperatures: Record<string, Partial<TemperatureSensor>>
  router: Partial<Router> | undefined
  routerHealth: RouterHealth | null
  routerUpdatedAt: number | undefined
  busStatus: ConnectionStatus
  tailscale: TailscaleStatus | null
  brightness: number | null
  autoSleepEnabled: boolean | null
  autoSleepTimeoutMinutes: AutoSleepTimeoutMinutes | null
  /** The Alerts toggle: the same instance `useAlertToasts` reads. */
  alertsEnabled: boolean
  setAlertsEnabled: (enabled: boolean) => void
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext)
  if (value === null) throw new Error('useSettings must be used inside a SettingsProvider')
  return value
}
