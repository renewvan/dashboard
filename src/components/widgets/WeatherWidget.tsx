// Home-tab weather card: current conditions + 3-day outlook (today first)
// from Open-Meteo (no API key) at the van's GPS position, plus the van's own
// Inside/Outside readings from the node-temperature probes on the bus.
// Outside shows the outdoor probe and falls back to Open-Meteo's air
// temperature, labelled "(forecast)", when the probe has no valid reading.

import { useEffect, useState } from 'react'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import { INDOOR_ID, OUTDOOR_ID, formatTemperature, temperatureReading } from '@/lib/temperature'
import type { TemperatureSensor } from '@/types'

interface Day {
  date: string
  code: number
  max: number
  min: number
}

interface Weather {
  temp: number
  code: number
  days: Day[]
}

const FALLBACK = { lat: 52.52, lon: 13.41 } // Berlin, used when GPS has no fix
const REFRESH_MS = 10 * 60 * 1000

function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} />
  if (code <= 2) return <CloudSun className={className} />
  if (code === 3) return <Cloud className={className} />
  if (code === 45 || code === 48) return <CloudFog className={className} />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return <Snowflake className={className} />
  if (code >= 95) return <CloudLightning className={className} />
  return <CloudRain className={className} />
}

function useWeather(lat: number, lon: number) {
  const [weather, setWeather] = useState<Weather | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code` +
          `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
          `&timezone=auto&forecast_days=5`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const d = await res.json()
        if (cancelled) return
        setWeather({
          temp: d.current.temperature_2m,
          code: d.current.weather_code,
          days: d.daily.time.map((date: string, i: number) => ({
            date,
            code: d.daily.weather_code[i],
            max: d.daily.temperature_2m_max[i],
            min: d.daily.temperature_2m_min[i],
          })),
        })
        setError(null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }
    load()
    const id = setInterval(load, REFRESH_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [lat, lon])

  return { weather, error }
}

const dayName = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
const deg = (n: number) => `${Math.round(n)}°`

export interface WeatherWidgetProps {
  lat?: number
  lon?: number
  /** Live bus sensors; `indoor`/`outdoor` (lib/temperature.ts) drive the
   * Inside/Outside readings. */
  temperatures: Record<string, Partial<TemperatureSensor>>
}

export function WeatherWidget({ lat, lon, temperatures }: WeatherWidgetProps) {
  const { weather, error } = useWeather(lat ?? FALLBACK.lat, lon ?? FALLBACK.lon)
  const indoor = temperatures[INDOOR_ID]
  const outdoor = temperatures[OUTDOOR_ID]

  if (!weather) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {error ? `Weather unavailable (${error})` : 'Loading weather…'}
      </div>
    )
  }

  // The outdoor probe is the source of truth; Open-Meteo's air temperature
  // only stands in while the probe has no valid reading, and is flagged so a
  // forecast value is never mistaken for the sensor.
  const outdoorFromProbe = temperatureReading(outdoor) !== null
  const outsideText = outdoorFromProbe
    ? formatTemperature(outdoor)
    : formatTemperature({ temperature_c: weather.temp, status: 'ok', unit: outdoor?.unit })

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <div className="flex min-h-0 flex-[1.5] items-center justify-around gap-2 pt-0.5">
        <WeatherIcon code={weather.code} className="size-10 shrink-0" />
        <div className="flex flex-col items-center" data-testid="weather-outside">
          <span className="text-3xl leading-none font-semibold tabular-nums">{outsideText}</span>
          <span className="text-muted-foreground mt-1 text-xs">
            {outdoor?.name ?? 'Outside'}
            {!outdoorFromProbe && ' (forecast)'}
          </span>
        </div>
        <div className="flex flex-col items-center" data-testid="weather-inside">
          <span className="text-3xl leading-none font-semibold tabular-nums">
            {formatTemperature(indoor)}
          </span>
          <span className="text-muted-foreground mt-1 text-xs">{indoor?.name ?? 'Inside'}</span>
        </div>
      </div>
      <Separator className="mb-1" />
      <div className="grid min-h-0 flex-[2] grid-cols-3 gap-1">
        {weather.days.slice(0, 3).map((d, i) => (
          <div
            key={d.date}
            className={cn(
              'flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-2 py-1 text-xs',
              i === 0 && 'bg-black/30 ring-1 ring-white/10',
            )}
          >
            <span className={cn('text-xs', i !== 0 && 'text-muted-foreground')}>
              {i === 0 ? 'Today' : dayName(d.date)}
            </span>
            <WeatherIcon code={d.code} className="size-8" />
            <span className="tabular-nums">
              {deg(d.max)} <span className="text-muted-foreground">|</span> {deg(d.min)}
            </span>
          </div>
        ))}
      </div>
      {lat === undefined && (
        <div className="text-muted-foreground text-[9px]">no GPS fix - using fallback location</div>
      )}
    </div>
  )
}
