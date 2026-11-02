import { Label, Switch } from '@heroui/react'
import { sensorLabel, sortedSensorIds } from '@/lib/temperature'
import type { TemperatureSensor } from '@/types'
import { Group } from '../../shared/Group'

interface TemperaturePageViewProps {
  temperatures: Record<string, Partial<TemperatureSensor>>
  hidden: readonly string[]
  onChange: (hidden: readonly string[]) => void
}

/**
 * Settings › General › Display & Appearance › Temperature page: which sensors the page shows. A
 * switch per sensor on the bus, and per one hidden that is not (yet), so a hidden sensor can
 * always be switched back on.
 */
export function TemperaturePageView({ temperatures, hidden, onChange }: TemperaturePageViewProps) {
  const reported = sortedSensorIds(temperatures)
  const ids = [...reported, ...hidden.filter((id) => !reported.includes(id))]

  const setShown = (id: string, shown: boolean) =>
    onChange(shown ? hidden.filter((h) => h !== id) : [...hidden, id])

  return (
    <div className="flex flex-col gap-4">
      <Group title="Sensors">
        {ids.length === 0 ? (
          <p className="text-muted px-1 text-sm">No temperature sensors found.</p>
        ) : (
          <div className="border-border bg-surface divide-border divide-y overflow-hidden rounded-2xl border">
            {ids.map((id) => {
              const shown = !hidden.includes(id)
              const label = temperatures[id] ? sensorLabel(id, temperatures[id]) : id
              return (
                <Switch
                  key={id}
                  className="w-full"
                  isSelected={shown}
                  onChange={(next) => setShown(id, next)}
                >
                  <Switch.Content className="w-full justify-between gap-3 px-3.5 py-3">
                    <Label className="flex flex-col items-start gap-0.5 text-sm font-medium">
                      {label}
                      <span className="text-muted text-xs font-normal">
                        {shown ? 'Shown on the Temperature page' : 'Hidden'}
                      </span>
                    </Label>
                    <Switch.Control>
                      <Switch.Thumb />
                    </Switch.Control>
                  </Switch.Content>
                </Switch>
              )
            })}
          </div>
        )}
        <p className="text-muted px-1 text-sm">
          A sensor you hide is still read and logged; it just does not get a card on the page.
        </p>
      </Group>
    </div>
  )
}
