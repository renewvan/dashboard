import type { Day } from './WeatherForecast'

export interface Weather {
  temp: number
  code: number
  days: Day[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isListOf<T>(value: unknown, type: 'number' | 'string'): value is T[] {
  return Array.isArray(value) && value.every((item) => typeof item === type)
}

/**
 * The Open-Meteo forecast response (`current=temperature_2m,weather_code`,
 * `daily=weather_code,temperature_2m_max,temperature_2m_min`), checked before it is read: the
 * response is someone else's JSON, so a changed or partial shape reads as no weather rather than
 * throwing a TypeError whose raw message would reach the card. The daily lists are matched by
 * index to `daily.time`, so every one must be as long as it.
 */
export function parseForecast(data: unknown): Weather | undefined {
  if (!isRecord(data) || !isRecord(data.current) || !isRecord(data.daily)) return undefined
  const { temperature_2m: temp, weather_code: code } = data.current
  if (typeof temp !== 'number' || typeof code !== 'number') return undefined
  const { time, weather_code: codes, temperature_2m_max: max, temperature_2m_min: min } = data.daily
  if (!isListOf<string>(time, 'string')) return undefined
  if (
    !isListOf<number>(codes, 'number') ||
    !isListOf<number>(max, 'number') ||
    !isListOf<number>(min, 'number') ||
    [codes, max, min].some((list) => list.length !== time.length)
  ) {
    return undefined
  }
  return {
    temp,
    code,
    days: time.map((date, i) => ({ date, code: codes[i], max: max[i], min: min[i] })),
  }
}
