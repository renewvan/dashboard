import { useAlertsEnabled } from '@/hooks/useAlertsEnabled'
import { useMapTheme } from '@/hooks/useMapTheme'
import { useNavbarPosition } from '@/hooks/useNavbarPosition'
import { usePowerLayout } from '@/hooks/usePowerLayout'
import { useStartLayout } from '@/hooks/useStartLayout'
import { useStartTiles } from '@/hooks/useStartTiles'
import { useStartView } from '@/hooks/useStartView'
import { useStartPowerSources } from '@/hooks/useStartPowerSources'
import { useTheme } from '@/hooks/useTheme'
import { useVan } from '@/hooks/useVan'
import type { SettingsActions, SettingsPreferences } from '@/components/settings/SettingsContext'

/**
 * The kiosk-local preferences, each a stored hook instance, as the values and the setters the
 * Settings context takes. `App` reads the same instances (theme, navbar position, map theme), so
 * the header, the shell and Settings can never disagree.
 */
export function usePreferences(): {
  preferences: Pick<
    SettingsPreferences,
    | 'alertsEnabled'
    | 'theme'
    | 'navbarPosition'
    | 'startPowerSources'
    | 'startLayout'
    | 'startView'
    | 'startTiles'
    | 'powerLayout'
    | 'mapTheme'
    | 'van'
  >
  actions: Pick<
    SettingsActions,
    | 'setAlertsEnabled'
    | 'setTheme'
    | 'setNavbarPosition'
    | 'setStartPowerSources'
    | 'setStartLayout'
    | 'setStartView'
    | 'setStartTiles'
    | 'setPowerLayout'
    | 'setMapTheme'
    | 'setVanField'
  >
} {
  const [alertsEnabled, setAlertsEnabled] = useAlertsEnabled()
  const [theme, setTheme] = useTheme()
  const [navbarPosition, setNavbarPosition] = useNavbarPosition()
  const [startPowerSources, setStartPowerSources] = useStartPowerSources()
  const [startLayout, setStartLayout] = useStartLayout()
  const [startView, setStartView] = useStartView()
  const [startTiles, setStartTiles] = useStartTiles()
  const [powerLayout, setPowerLayout] = usePowerLayout()
  const [mapTheme, setMapTheme] = useMapTheme()
  const [van, setVanField] = useVan()
  return {
    preferences: {
      alertsEnabled,
      theme,
      navbarPosition,
      startPowerSources,
      startLayout,
      startView,
      startTiles,
      powerLayout,
      mapTheme,
      van,
    },
    actions: {
      setAlertsEnabled,
      setTheme,
      setNavbarPosition,
      setStartPowerSources,
      setStartLayout,
      setStartView,
      setStartTiles,
      setPowerLayout,
      setMapTheme,
      setVanField,
    },
  }
}
