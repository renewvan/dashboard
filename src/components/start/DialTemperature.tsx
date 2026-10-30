import { createElement } from 'react'
import { Armchair, Cpu, Park, Thermometer } from 'lucide-react'
import { INDOOR_ID, OUTDOOR_ID, formatTemperature, sensorLabel } from '@/lib/temperature'
import { temperatureIcon } from '@/lib/temperatureIcons'
import type { TemperatureSensor } from '@/types'

/**
 * One probe's reading, floated above the top of a half-moon: the one picked in Settings for that
 * side (outdoor over the left one, indoor over the right one, by default). Absolutely positioned inside the half-moon's `relative` wrapper, so it takes no
 * room: the Dial's grid, gaps and the half-moon's own box keep their size.
 */
export function DialTemperature({
  sensorId,
  sensor,
  side,
}: {
  /** The probe's id: the outdoor and indoor ones get their own label, and an icon unless the probe names one. */
  sensorId: string
  /** Undefined until the probe publishes anything; the reading then shows a dash. */
  sensor: Partial<TemperatureSensor> | undefined
  /** The half-moon it sits on: the reading hugs the edge facing the rings. */
  side: 'left' | 'right'
}) {
  const kind = sensorId === OUTDOOR_ID ? 'outdoor' : sensorId === INDOOR_ID ? 'indoor' : 'other'
  // The probe's own `icon` first; else the outdoor and indoor ones, and the Pi's CPU, by what they are.
  const icon = createElement(
    temperatureIcon(sensor?.icon) ??
      (kind === 'outdoor'
        ? Park
        : kind === 'indoor'
          ? Armchair
          : sensor?.source === 'cpu'
            ? Cpu
            : Thermometer),
    { className: 'size-4', 'aria-hidden': true },
  )
  const fallback = kind === 'outdoor' ? 'Outside' : kind === 'indoor' ? 'Inside' : sensorId
  return (
    <div
      data-testid={`temp-${kind}`}
      className={`pointer-events-none absolute -top-8 flex flex-col gap-1 ${
        side === 'left' ? 'left-30 items-start' : 'right-30 items-end'
      }`}
    >
      <div
        className={`text-muted flex items-center gap-1.5 text-[11px] tracking-[0.2em] whitespace-nowrap uppercase ${
          side === 'left' ? 'ml-1' : 'mr-1'
        }`}
      >
        {side === 'left' && icon}
        {sensor?.name ?? (sensor && kind === 'other' ? sensorLabel(sensorId, sensor) : fallback)}
        {side === 'right' && icon}
      </div>
      <div className="text-3xl font-light italic tabular-nums">
        {formatTemperature(sensor)}
        <span className="text-accent ml-0.5 text-lg font-semibold not-italic">
          {sensor?.unit === 'F' ? 'F' : 'C'}
        </span>
      </div>
    </div>
  )
}
