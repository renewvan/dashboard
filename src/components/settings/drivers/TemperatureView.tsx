import { useId } from 'react'
import { ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { formatTemperature, sensorLabel, sortedSensorIds, titleCase } from '@/lib/temperature'
import type { TemperatureSensor, TemperatureUnit } from '@/types'
import { instanceKey } from '@/lib/instances'
import { TEMPERATURE_ICON_NAMES, TEMPERATURE_ICONS } from '@/lib/temperatureIcons'
import { EntityCard } from '../shared/EntityCard'
import { temperatureRowSummary } from './entitySummary'
import { NameField } from '../shared/NameField'
import { useSettingsData, useSettingsActions } from '../SettingsContext'

const UNITS: TemperatureUnit[] = ['C', 'F']

function isUnit(value: string): value is TemperatureUnit {
  return UNITS.some((unit) => unit === value)
}

/** Settings › Devices › Temperature › <sensor> › Details: rename the sensor, pick its unit and its icon. It is titled by its topic name (the id), the one thing unique to it. */
export function TemperatureDetails({ id }: { id: string }) {
  const { temperatures } = useSettingsData()
  const sensor = temperatures[id]
  if (sensor === undefined) return null
  return <SensorPanel id={id} sensor={sensor} />
}

function SensorPanel({ id, sensor }: { id: string; sensor: Partial<TemperatureSensor> }) {
  const { setTemperatureName, setTemperatureUnit, setTemperatureIcon } = useSettingsActions()
  const sourceId = useId()

  return (
    <div
      role="group"
      aria-labelledby={sourceId}
      className="border-border bg-surface flex flex-col gap-3 rounded-2xl border px-3.5 py-3"
    >
      <div className="flex items-center justify-between gap-3">
        <span id={sourceId} className="text-muted min-w-0 text-xs break-words">
          {titleCase(id)}
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
      <div className="flex items-start justify-between gap-3">
        <span className="text-muted pt-2 text-xs">Icon</span>
        <ToggleButtonGroup
          aria-label="Icon"
          selectionMode="single"
          disallowEmptySelection
          isDisabled={sensor.name === undefined}
          selectedKeys={
            new Set(
              sensor.icon !== undefined && sensor.icon in TEMPERATURE_ICONS ? [sensor.icon] : [],
            )
          }
          onSelectionChange={(keys) => {
            const key = [...keys][0]
            if (key === undefined) return
            const next = String(key)
            // HeroUI re-fires the selection on a re-tap of the selected item.
            if (next in TEMPERATURE_ICONS && next !== sensor.icon) setTemperatureIcon(id, next)
          }}
          className="flex-wrap justify-end"
        >
          {TEMPERATURE_ICON_NAMES.map((name) => {
            const Icon = TEMPERATURE_ICONS[name]
            return (
              <ToggleButton key={name} id={name} isIconOnly aria-label={name}>
                <Icon aria-hidden="true" className="size-4" />
              </ToggleButton>
            )
          })}
        </ToggleButtonGroup>
      </div>
    </div>
  )
}

/** Settings › Devices › Temperature: one card per sensor, each opening its Details. */
export function TemperatureView({ onOpen }: { onOpen: (key: string) => void }) {
  const { temperatures } = useSettingsData()
  const ids = sortedSensorIds(temperatures)

  if (ids.length === 0) {
    return (
      <p className="border-border bg-surface text-muted rounded-2xl border px-3.5 py-3 text-sm">
        No temperature sensors found. Waiting for driver-temperature to publish.
      </p>
    )
  }

  return (
    <ul aria-label="Temperature" className="flex flex-col gap-2">
      {ids.map((id) => (
        <li key={id}>
          <EntityCard
            label={sensorLabel(id, temperatures[id])}
            summary={temperatureRowSummary(temperatures[id])}
            onOpen={() => onOpen(instanceKey('temperature', id))}
          />
        </li>
      ))}
    </ul>
  )
}
