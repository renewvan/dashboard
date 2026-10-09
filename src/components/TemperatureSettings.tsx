import { useRef, useState } from 'react'
import { Input } from './ui/input'
import { Frame, FramePanel } from './ui/frame'
import { formatTemperature, sortedSensorIds } from '@/lib/temperature'
import {
  segmentedControlRootClassName,
  segmentedControlItemVariants,
} from '@/lib/segmented-control'
import type { TemperatureSensor, TemperatureUnit } from '@/types'

const UNITS: TemperatureUnit[] = ['C', 'F']

export interface TemperatureSettingsProps {
  temperatures: Record<string, Partial<TemperatureSensor>>
  /** Publishes `renewvan/temperature/<id>/name/set` (trimmed, non-empty). */
  onNameChange: (id: string, name: string) => void
  /** Publishes `renewvan/temperature/<id>/unit/set`. */
  onUnitChange: (id: string, unit: TemperatureUnit) => void
}

/**
 * Name field that commits on blur/Enter instead of per keystroke: every
 * commit becomes a retained identity topic and a state-file write on the Pi,
 * so typing "Galley fridge" must not publish eleven partial names. While not
 * editing it shows the bus value directly (another client's edit, or the node
 * rejecting ours, shows through); the typed draft only exists mid-edit.
 */
function SensorName({
  id,
  name,
  onCommit,
}: {
  id: string
  name: string | undefined
  onCommit: (name: string) => void
}) {
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState(false)
  const cancelled = useRef(false)

  const startEditing = () => {
    setDraft(name ?? '')
    setEditing(true)
  }

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
    <Input
      aria-label={`Name for ${id}`}
      value={editing ? draft : (name ?? '')}
      disabled={name === undefined}
      onFocus={startEditing}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
        if (e.key === 'Escape') {
          cancelled.current = true
          e.currentTarget.blur()
        }
      }}
    />
  )
}

function SensorRow({
  id,
  sensor,
  onNameChange,
  onUnitChange,
}: {
  id: string
  sensor: Partial<TemperatureSensor>
} & Pick<TemperatureSettingsProps, 'onNameChange' | 'onUnitChange'>) {
  return (
    <div className="flex flex-col gap-2 px-3.5 py-2.5" data-testid={`temperature-sensor-${id}`}>
      <div className="flex items-center justify-between gap-3">
        <span className="text-muted-foreground text-xs">
          {sensor.source === 'cpu' ? 'Pi CPU' : (sensor.serial ?? id)}
        </span>
        <span className="text-sm font-medium tabular-nums">
          {formatTemperature(sensor, { suffix: true })}
        </span>
      </div>
      <SensorName id={id} name={sensor.name} onCommit={(next) => onNameChange(id, next)} />
      <div className="flex items-center justify-between">
        <span className="text-muted-foreground text-xs">Show in</span>
        <div className={segmentedControlRootClassName} role="group" aria-label={`Unit for ${id}`}>
          {UNITS.map((unit) => (
            <button
              key={unit}
              type="button"
              disabled={sensor.unit === undefined}
              data-checked={sensor.unit === unit || undefined}
              aria-pressed={sensor.unit === unit}
              className={segmentedControlItemVariants({ state: 'checked' })}
              onClick={() => onUnitChange(id, unit)}
            >
              °{unit}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

const FRAME_CLASS = 'bg-transparent p-0 gap-0'
const PANEL_CLASS = 'overflow-hidden border-white/10 bg-card/20 p-0 backdrop-blur-md'

/** Body of the Settings → Temperature subpage/sheet: one panel per sensor. */
export function TemperatureSettings({
  temperatures,
  onNameChange,
  onUnitChange,
}: TemperatureSettingsProps) {
  const ids = sortedSensorIds(temperatures)
  if (ids.length === 0) {
    return (
      <Frame className={FRAME_CLASS}>
        <FramePanel className={PANEL_CLASS}>
          <p className="text-muted-foreground px-3.5 py-3 text-sm">
            No temperature sensors found. Waiting for node-temperature to publish.
          </p>
        </FramePanel>
      </Frame>
    )
  }
  return (
    <Frame className={FRAME_CLASS}>
      {ids.map((id) => (
        <FramePanel key={id} className={PANEL_CLASS}>
          <SensorRow
            id={id}
            sensor={temperatures[id]}
            onNameChange={onNameChange}
            onUnitChange={onUnitChange}
          />
        </FramePanel>
      ))}
    </Frame>
  )
}
