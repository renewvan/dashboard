import { Zap } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/EmptyState'
import { RadialGauge } from '@/components/RadialGauge'
import { isCompleteBattery, type Battery } from '@/types'

export interface PowerTabProps {
  batteries: Record<string, Battery>
}

export function PowerTab({ batteries }: PowerTabProps) {
  // MQTT builds a battery up one property per retained message; skip any
  // id whose record hasn't fully arrived yet instead of crashing on the
  // still-missing fields (see `isCompleteBattery`).
  const ids = Object.keys(batteries)
    .filter((id) => isCompleteBattery(batteries[id]))
    .sort()

  if (ids.length === 0) {
    return (
      <EmptyState
        icon={<Zap />}
        title="No battery data yet."
        description="Waiting for readings from the renewvan hub."
      />
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
      {ids.map((id) => {
        const battery = batteries[id]
        const sign = battery.current_a > 0 ? '+' : ''
        return (
          <Card key={id}>
            <CardContent className="flex flex-col items-center gap-2 text-center">
              <RadialGauge pct={battery.soc_pct} label={`Battery (${id})`} color="var(--ok)" />
              <div className="text-muted-foreground text-xs">
                {battery.voltage_v.toFixed(1)} V · {sign}
                {battery.current_a.toFixed(1)} A · {battery.power_w.toFixed(0)} W ·{' '}
                {battery.temperature_c.toFixed(0)}°C
              </div>
              <Badge variant="success">{battery.charge_state}</Badge>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
