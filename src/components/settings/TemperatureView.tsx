import { useId, useRef, useState } from 'react'
import { Input, Label, TextField, ToggleButton, ToggleButtonGroup } from '@heroui/react'
import { formatTemperature, sortedSensorIds } from '@/lib/temperature'
import type { TemperatureSensor, TemperatureUnit } from '@/types'
import { useSettings } from './SettingsContext'

const UNITS: TemperatureUnit[] = ['C', 'F']

function isUnit(value: string): value is TemperatureUnit {
  return UNITS.some((unit) => unit === value)
}

/**
 * Name field that commits on Enter or on leaving the field instead of per
 * keystroke: every commit becomes a retained identity topic and a state-file
 * write on the Pi, so typing "Galley fridge" must not publish eleven partial
 * names. While not editing it shows the bus value directly (another client's
 * edit, or the node rejecting ours, shows through); the typed draft only
 * exists mid-edit. Nothing is applied optimistically.
 */
function SensorName({
  name,
  onCommit,
}: {
  name: string | undefined
  onCommit: (name: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const cancelled = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const startEditing = () => {
    setDraft(name ?? '')
    setEditing(true)
  }

  // The one commit path: Enter and Escape both blur the input, so this runs on every way out.
  const commit = () => {
    setEditing(false)
    // Escape's blur() runs this synchronously, before any state it set has
    // re-rendered -- without the flag a cancelled edit would be published.
    const wasCancelled = cancelled.current
    cancelled.current = false
    const next = draft.trim()
    if (wasCancelled || next === '' || next === name) return
    onCommit(next)
  }

  return (
    <TextField
      value={editing ? draft : (name ?? '')}
      isDisabled={name === undefined}
      onChange={setDraft}
      onFocus={startEditing}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') inputRef.current?.blur()
        if (event.key === 'Escape') {
          cancelled.current = true
          inputRef.current?.blur()
        }
      }}
    >
      <Label>Name</Label>
      <Input ref={inputRef} variant="secondary" fullWidth />
    </TextField>
  )
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
      <SensorName name={sensor.name} onCommit={(name) => setTemperatureName(id, name)} />
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
