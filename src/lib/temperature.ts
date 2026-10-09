import type { TemperatureSensor, TemperatureUnit } from '@/types'

/** Sensor ids the Home widget binds to. They are the `[sensor.<id>]`
 * section names in the Pi's node-temperature config.ini
 * (hub/docker/temperature/config.ini.default), not anything on the wire
 * that marks a probe as indoor/outdoor. */
export const INDOOR_ID = 'indoor'
export const OUTDOOR_ID = 'outdoor'

export function convertTemperature(celsius: number, unit: TemperatureUnit): number {
  return unit === 'F' ? (celsius * 9) / 5 + 32 : celsius
}

/**
 * The sensor's current value in Celsius, or `null` when it must not be
 * shown: status is not 'ok' (the node stops republishing `temperature_c`
 * but the last retained value stays on the broker, so it would read as
 * live), or the sensor hasn't delivered a value yet.
 */
export function temperatureReading(sensor: Partial<TemperatureSensor> | undefined): number | null {
  if (!sensor || sensor.status !== 'ok') return null
  return typeof sensor.temperature_c === 'number' ? sensor.temperature_c : null
}

/** Whole-degree display with the sensor's unit, e.g. `21°`; `--°` when
 * there is nothing trustworthy to show. `suffix` appends the unit letter
 * (`21°C`) for contexts without a neighbouring label. */
export function formatTemperature(
  sensor: Partial<TemperatureSensor> | undefined,
  { suffix = false }: { suffix?: boolean } = {},
): string {
  const celsius = temperatureReading(sensor)
  const unit: TemperatureUnit = sensor?.unit === 'F' ? 'F' : 'C'
  if (celsius === null) return suffix ? `--°${unit}` : '--°'
  const rounded = Math.round(convertTemperature(celsius, unit))
  // Math.round(-0.4) is -0, which would print as "-0°".
  const value = Object.is(rounded, -0) ? 0 : rounded
  return suffix ? `${value}°${unit}` : `${value}°`
}

/** Sensors in stable display order: the two named ones first, then the rest
 * by id, so a freshly discovered probe never reshuffles the list. */
export function sortedSensorIds(sensors: Record<string, Partial<TemperatureSensor>>): string[] {
  const rank = (id: string) => (id === OUTDOOR_ID ? 0 : id === INDOOR_ID ? 1 : 2)
  return Object.keys(sensors).sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

/** Headline for the Settings group row, e.g. `2 sensors`. */
export function temperatureSummary(sensors: Record<string, unknown>): string {
  const count = Object.keys(sensors).length
  if (count === 0) return 'No sensors found'
  return count === 1 ? '1 sensor' : `${count} sensors`
}
