import { Cloud, CloudFog, CloudLightning, CloudRain, CloudSun, Snowflake, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Day {
  date: string
  code: number
  max: number
  min: number
}

/** WMO weather code to icon; shared by the current conditions and each forecast day. */
export function WeatherIcon({ code, className }: { code: number; className?: string }) {
  if (code === 0) return <Sun className={className} aria-hidden="true" />
  if (code <= 2) return <CloudSun className={className} aria-hidden="true" />
  if (code === 3) return <Cloud className={className} aria-hidden="true" />
  if (code === 45 || code === 48) return <CloudFog className={className} aria-hidden="true" />
  if ((code >= 71 && code <= 77) || code === 85 || code === 86)
    return <Snowflake className={className} aria-hidden="true" />
  if (code >= 95) return <CloudLightning className={className} aria-hidden="true" />
  return <CloudRain className={className} aria-hidden="true" />
}

const dayName = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' })
const deg = (n: number) => `${Math.round(n)}°`

export interface WeatherForecastProps {
  /** Daily outlook, today first; every day given is shown. */
  days: Day[]
}

/** The outlook strip: today (highlighted) and the days after it, each with its icon and high/low. */
export function WeatherForecast({ days }: WeatherForecastProps) {
  return (
    <div
      className="mx-auto grid min-h-0 w-full gap-0.5"
      style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}
    >
      {days.map((d, i) => (
        <div
          key={d.date}
          className={cn(
            'flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg px-1 text-[10px] leading-tight',
            i === 0 && 'bg-black/10 ring-1 ring-white/10',
          )}
        >
          <span className={cn(i !== 0 && 'text-muted')}>{i === 0 ? 'Today' : dayName(d.date)}</span>
          <WeatherIcon code={d.code} className="size-4" />
          <span className="flex justify-center gap-1 tabular-nums">
            <span>{deg(d.max)}</span>
            <span className="text-muted">{deg(d.min)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
