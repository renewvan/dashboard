import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { FLUID_LABELS, STATUS_LABELS } from '@/lib/tank-labels'
import type { Tank } from '@/types'
import { ConfigureButton } from './ConfigureButton'

export interface TankRowCardProps {
  id: string
  tank: Tank
}

/**
 * Variant B ("compact row"): thin fill bar, dense, kiosk-glanceable.
 * Kept as a first-class component per wayfinder ticket
 * `01-prototype-tank-card`'s scope call — not the shipped default,
 * unused until an installer-time style picker exists (see map's
 * "Not yet specified"). Pure presentational component.
 */
export function TankRowCard({ id, tank }: TankRowCardProps) {
  const ok = tank.status === 'ok'
  const pct = Math.min(100, Math.max(0, tank.level_pct))
  const liters = Math.round((tank.capacity_l * tank.level_pct) / 100)

  return (
    <Card data-testid="tank-row-card">
      <CardContent className="flex flex-row items-center gap-4 py-3">
        <div className="relative h-16 w-6 shrink-0 overflow-hidden rounded-full border bg-[var(--panel-2)]">
          <div
            className="absolute inset-x-0 bottom-0"
            style={{ height: `${pct}%`, background: ok ? 'var(--accent)' : 'var(--bad)' }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{FLUID_LABELS[tank.fluid_type]}</span>
            <span className="text-muted-foreground text-xs">{id}</span>
            <Badge variant={ok ? 'success' : 'destructive'} size="sm">
              {ok ? 'Normal' : 'Fault'}
            </Badge>
          </div>
          <div className="text-muted-foreground text-sm">
            {ok ? `${liters}/${tank.capacity_l} L` : STATUS_LABELS[tank.status]}
          </div>
        </div>
        <div className="text-2xl font-bold tabular-nums">{pct.toFixed(0)}%</div>
        <ConfigureButton size="icon" iconOnly />
      </CardContent>
    </Card>
  )
}
