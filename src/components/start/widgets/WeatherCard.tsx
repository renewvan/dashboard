import { CloudSun } from 'lucide-react'
import { PhoneCard } from '@/components/PhoneCard'
import { WeatherWidget } from '@/components/widgets/weather/WeatherWidget'
import { hasGpsFix, isCompleteGps, type Gps } from '@/types'
import type { StartWidgetProps } from './types'

/** The weather where the van is: looked up at the first GPS record with a plottable position. */
export function WeatherCard({ gps, temperatures }: StartWidgetProps) {
  const fix = Object.values(gps).find((g): g is Gps => isCompleteGps(g) && hasGpsFix(g))
  return (
    <PhoneCard title="Weather" icon={<CloudSun className="size-4" />}>
      <div className="h-30 w-full">
        <WeatherWidget lat={fix?.latitude} lon={fix?.longitude} temperatures={temperatures} />
      </div>
    </PhoneCard>
  )
}
