import { MAP_THEME_CHOICES, MAP_THEME_LABELS, type MapThemeChoice } from '@/hooks/useMapTheme'
import { Card, ChoiceRow } from '../../shared/ChoiceRow'
import { Group } from '../../shared/Group'

const THEME_CHOICES = MAP_THEME_CHOICES.map((value) => ({ value, label: MAP_THEME_LABELS[value] }))

const THEME_HINTS: Record<MapThemeChoice, string> = {
  auto: 'The map follows the app: a light map in the light theme, a dark map in the dark theme.',
  light: 'Always a light map, whatever the app theme is.',
  dark: 'Always a dark map, whatever the app theme is. Easier on the eyes at night.',
}

interface MapPageViewProps {
  theme: MapThemeChoice
  onChange: (theme: MapThemeChoice) => void
}

/**
 * Settings › General › Display & Appearance › Map page: which look the Map page draws. It only
 * changes the map's colours; the van, the readout and the zoom buttons are the same either way.
 */
export function MapPageView({ theme, onChange }: MapPageViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Group title="Map theme">
        <Card>
          <ChoiceRow label="Map theme" choices={THEME_CHOICES} value={theme} onChange={onChange} />
        </Card>
        <p className="text-muted px-1 text-sm">{THEME_HINTS[theme]}</p>
      </Group>
    </div>
  )
}
