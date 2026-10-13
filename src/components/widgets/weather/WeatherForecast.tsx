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
  /** Daily outlook, today first; the first four are shown. */
  days: Day[]
}

/** The outlook strip: today (highlighted) and the next three days, each with its icon and high/low. */
export function WeatherForecast({ days }: WeatherForecastProps) {
  return (
    <div className="grid min-h-0 grid-cols-4 gap-2">
      {days.slice(0, 4).map((d, i) => (
        <div
          key={d.date}
          className={cn(
            'flex flex-col items-center rounded-lg py-0.5 text-[10px] leading-tight',
            i === 0 && 'bg-black/30 ring-1 ring-white/10',
          )}
        >
          <span className={cn(i !== 0 && 'text-muted')}>{i === 0 ? 'Today' : dayName(d.date)}</span>
          <WeatherIcon code={d.code} className="size-4" />
          <span className="tabular-nums">
            {deg(d.max)}
            <span className="text-muted"> {deg(d.min)}</span>
          </span>
        </div>
      ))}
    </div>
  )
}
