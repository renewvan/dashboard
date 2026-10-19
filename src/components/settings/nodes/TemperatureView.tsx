import { useId } from 'react'
import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { formatTemperature, sortedSensorIds } from '@/lib/temperature'
import type { TemperatureSensor, TemperatureUnit } from '@/types'
import { NameField } from '../shared/NameField'
import { useSettings } from '../SettingsContext'

const UNITS: TemperatureUnit[] = ['C', 'F']

function isUnit(value: string): value is TemperatureUnit {
  return UNITS.some((unit) => unit === value)
}

function SensorPanel({ id, sensor }: { id: string; sensor: Partial<TemperatureSensor> }) {
  const { setTemperatureName, setTemperatureUnit } = useSettings()
  const sourceId = useId()

  return (
    <div
      role="group"
      aria-labelledby={sourceId}
      className="border-border bg-surface flex flex-col gap-3 rounded-2xl border px-3.5 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span id={sourceId} className="text-muted min-w-0 text-xs break-words">
          {sensor.source === 'cpu' ? 'Pi CPU' : (sensor.serial ?? id)}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {formatTemperature(sensor, { suffix: true })}
        </span>
      </div>
      <NameField
        name={sensor.name}
        isDisabled={sensor.name === undefined}
        onCommit={(name) => setTemperatureName(id, name)}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted text-xs">Show in</span>
        <ToggleButtonGroup
          aria-label="Show in"
          selectionMode="single"
          disallowEmptySelection
          isDisabled={sensor.unit === undefined}
          selectedKeys={new Set(sensor.unit === undefined ? [] : [sensor.unit])}
          onSelectionChange={(keys) => {
            const key = [...keys][0]
            if (key === undefined) return
            const next = String(key)
            // HeroUI re-fires the selection on a re-tap of the selected item.
            if (isUnit(next) && next !== sensor.unit) setTemperatureUnit(id, next)
          }}
        >
          {UNITS.map((unit, index) => (
            <ToggleButton key={unit} id={unit}>
              {index > 0 && <ToggleButtonGroup.Separator />}°{unit}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </div>
    </div>
  )
}

/** Settings › Nodes › Temperature: rename a sensor and pick its unit. */
export function TemperatureView() {
  const { temperatures } = useSettings()
  const ids = sortedSensorIds(temperatures)

  if (ids.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No temperature sensors found. Waiting for node-temperature to publish.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {ids.map((id) => (
        <SensorPanel key={id} id={id} sensor={temperatures[id]} />
      ))}
    </div>
  )
}
