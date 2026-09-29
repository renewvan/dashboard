import { Badge } from '../ui/badge'
import { Card, CardContent } from '../ui/card'
import { FLUID_LABELS, STATUS_LABELS } from '../../lib/tank-labels'
import type { Tank } from '../../types'
import { ConfigureButton } from './ConfigureButton'

export interface TankStatCardProps {
  id: string
  tank: Tank
}

/**
 * Variant C ("numeric-first"): giant % headline, horizontal capacity bar,
 * no tank silhouette. Kept as a first-class component per wayfinder
 * ticket `01-prototype-tank-card`'s scope call — not the shipped
 * default, unused until an installer-time style picker exists (see map's
 * "Not yet specified"). Pure presentational component.
 */
export function TankStatCard({ id, tank }: TankStatCardProps) {
  const ok = tank.status === 'ok'
  const pct = Math.min(100, Math.max(0, tank.level_pct))
  const liters = Math.round((tank.capacity_l * tank.level_pct) / 100)

  return (
    <Card data-testid="tank-stat-card">
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold">{FLUID_LABELS[tank.fluid_type]}</div>
            <div className="text-muted-foreground text-xs">{id}</div>
          </div>
          <Badge variant={ok ? 'success' : 'destructive'}>{ok ? 'Normal' : 'Fault'}</Badge>
        </div>
        <div
          className="text-5xl font-bold tabular-nums"
          style={{ color: ok ? 'var(--kiosk-accent)' : 'var(--bad)' }}
        >
          {pct.toFixed(0)}%
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--panel-2)]">
          <div
            className="h-full transition-[width]"
            style={{ width: `${pct}%`, background: ok ? 'var(--kiosk-accent)' : 'var(--bad)' }}
          />
        </div>
        <div className="text-muted-foreground text-sm">
          {ok ? `${liters} / ${tank.capacity_l} L` : STATUS_LABELS[tank.status]}
        </div>
        <ConfigureButton size="sm" />
      </CardContent>
    </Card>
  )
}
