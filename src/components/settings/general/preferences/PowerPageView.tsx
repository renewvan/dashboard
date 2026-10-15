import { POWER_LAYOUTS, POWER_LAYOUT_LABELS, type PowerLayout } from '@/hooks/usePowerLayout'
import { Card, ChoiceRow } from '../../shared/ChoiceRow'
import { Group } from '../../shared/Group'

const LAYOUT_CHOICES = POWER_LAYOUTS.map((value) => ({
  value,
  label: POWER_LAYOUT_LABELS[value],
}))

const LAYOUT_HINTS: Record<PowerLayout, string> = {
  tiles: 'Boxed readings for each source, the battery and the loads, joined by flowing lines.',
  flow: 'Round nodes on a diagram, with dots travelling along the wires from source to load.',
}

interface PowerPageViewProps {
  layout: PowerLayout
  onChange: (layout: PowerLayout) => void
}

/**
 * Settings › General › Display & Appearance › Power page: how the Power page draws the van's
 * power. The choice only changes the picture; both layouts show the same numbers.
 */
export function PowerPageView({ layout, onChange }: PowerPageViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Group title="Layout">
        <Card>
          <ChoiceRow
            label="Power layout"
            choices={LAYOUT_CHOICES}
            value={layout}
            onChange={onChange}
          />
        </Card>
        <p className="text-muted px-1 text-sm">{LAYOUT_HINTS[layout]}</p>
      </Group>
    </div>
  )
}
