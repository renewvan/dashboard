// Home-tab weather card: current conditions + 4-day outlook (today first)
// from Open-Meteo (no API key) at the van's GPS position.
//
// Inside temperature is SIMULATED: the bus has no temperature entity yet
// (`useRenewvanBus` TOPIC_PATTERN is tank|relay|battery|router|gps).
// Replace `useSimIndoor` with a bus-backed reading once the hub publishes one.

import { useEffect, useState } from 'react'
import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'

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

// Slow drift around 21C; stands in for a real cabin thermometer.
function useSimIndoor() {
  const [t, setT] = useState(21.4)
  useEffect(() => {
    const id = setInterval(
      () => setT((v) => Math.round((v + (Math.random() - 0.5) * 0.4) * 10) / 10),
      3000,
    )
    return () => clearInterval(id)
  }, [])
  return t
}

const dayName = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
const deg = (n: number) => `${Math.round(n)}°`

export function WeatherWidget({ lat, lon }: { lat?: number; lon?: number }) {
  const { weather, error } = useWeather(lat ?? FALLBACK.lat, lon ?? FALLBACK.lon)
  const indoor = useSimIndoor()

  if (!weather) {
    return (
      <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
        {error ? `Weather unavailable (${error})` : 'Loading weather…'}
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
      <div className="flex min-h-0 flex-[1.5] items-center justify-around gap-2">
        <WeatherIcon code={weather.code} className="size-12 shrink-0" />
        <div className="flex flex-col items-center">
          <span className="text-4xl leading-none font-semibold tabular-nums">
            {deg(weather.temp)}
          </span>
          <span className="text-muted-foreground mt-1 text-xs">Outside</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-4xl leading-none font-semibold tabular-nums">{deg(indoor)}</span>
          <span className="text-muted-foreground mt-1 text-xs">Inside</span>
        </div>
      </div>
      <Separator className="mt-1 mb-2" />
      <div className="grid min-h-0 flex-[2] grid-cols-3 gap-1">
        {weather.days.slice(0, 3).map((d, i) => (
          <div
            key={d.date}
            className={cn(
              'flex min-h-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-xl px-2 py-1 text-xs',
              i === 0 && 'bg-black/30 ring-1 ring-white/10',
            )}
          >
            <span className={cn('text-sm', i !== 0 && 'text-muted-foreground')}>
              {i === 0 ? 'Today' : dayName(d.date)}
            </span>
            <WeatherIcon code={d.code} className="size-6" />
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
