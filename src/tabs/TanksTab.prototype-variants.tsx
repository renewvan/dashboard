/**
 * PROTOTYPE-ONLY (see `skill://prototype` and wayfinder ticket
 * `.scratch/tanks-card-redesign/issues/01-prototype-tank-card.md`). Three
 * structurally different takes on the redesigned tank card, mounted inside
 * the real `TanksTab` behind `?variant=` (dev builds only — see
 * `PrototypeSwitcher`). Real tank data flows in as props; nothing here
 * mutates or fakes fields the hub doesn't send.
 *
 * Delete this file (and the switcher wiring in `TanksTab.tsx`) once ticket
 * 01 resolves; fold only the winning layout into real code.
 */
import { Settings } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tooltip, TooltipPopup, TooltipTrigger } from '@/components/ui/tooltip'
import { isCompleteTank, type Tank } from '../types'

const FLUID_LABELS: Record<Tank['fluid_type'], string> = {
  fresh_water: 'Fresh water',
  grey_water: 'Grey water',
  black_water: 'Black water',
  fuel: 'Fuel',
  lpg: 'LPG',
}

const STATUS_LABELS: Record<Tank['status'], string> = {
  ok: 'OK',
  open_circuit: 'Sensor fault: open circuit',
  short_circuit: 'Sensor fault: short circuit',
}

const TANK_ORDER = ['fresh', 'grey']

function orderedIds(tanks: Record<string, Tank>) {
  return Object.keys(tanks)
    .filter((id) => isCompleteTank(tanks[id]))
    .sort((a, b) => TANK_ORDER.indexOf(a) - TANK_ORDER.indexOf(b) || a.localeCompare(b))
}

function ConfigureButton({ size = 'default' as const, iconOnly = false }: { size?: 'default' | 'sm' | 'icon'; iconOnly?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button variant="outline" size={size} disabled className="pointer-events-auto">
            <Settings className="size-4" />
            {!iconOnly && 'Configure'}
          </Button>
        }
      />
      <TooltipPopup>Coming soon</TooltipPopup>
    </Tooltip>
  )
}

/** Variant A — reference-close: vertical tank silhouette + tick-marked scale, compact for a 3-per-row 7" (800×480) kiosk layout. */
export function VariantA({ tanks }: { tanks: Record<string, Tank> }) {
  const ids = orderedIds(tanks)
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,240px))] gap-3">
      {ids.map((id) => {
        const tank = tanks[id]
        const ok = tank.status === 'ok'
        const pct = Math.min(100, Math.max(0, tank.level_pct))
        const liters = Math.round((tank.capacity_l * tank.level_pct) / 100)
        return (
          <Card key={id}>
            <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="truncate font-semibold text-sm">{FLUID_LABELS[tank.fluid_type]}</div>
                <div className="text-muted-foreground text-xs">{id}</div>
              </div>
              <Badge variant={ok ? 'success' : 'destructive'} size="sm">
                {ok ? 'Normal' : 'Fault'}
              </Badge>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-2 px-3 py-1">
              {!ok && (
                <div className="text-center text-destructive-foreground text-xs">{STATUS_LABELS[tank.status]}</div>
              )}
              <div className="flex items-center gap-2">
                <div className="relative h-32 w-14 shrink-0 overflow-hidden rounded-xl border bg-[var(--panel-2)]">
                  {[25, 50, 75].map((mark) => (
                    <div
                      key={mark}
                      className="absolute inset-x-0 border-t border-[var(--bg)]"
                      style={{ bottom: `${mark}%` }}
                    />
                  ))}
                  <div
                    className="absolute inset-x-0 bottom-0 flex items-start justify-center rounded-t-sm pt-1 text-[10px] text-white font-semibold transition-[height]"
                    style={{ height: `${pct}%`, background: ok ? 'var(--kiosk-accent)' : 'var(--bad)' }}
                  >
                    {pct >= 16 && `${pct.toFixed(0)}%`}
                  </div>
                  {pct < 16 && (
                    <div className="absolute inset-x-0 top-1 text-center text-[10px] font-semibold">
                      {pct.toFixed(0)}%
                    </div>
                  )}
                </div>
                {/* Percentage scale: a tick-marked vertical axis, one small horizontal
                    divider per labelled value (100/75/50/25/0%), per the reference mockup. */}
                <div className="flex h-32 flex-col justify-between text-[10px] text-muted-foreground">
                  {[100, 75, 50, 25, 0].map((mark) => (
                    <div key={mark} className="flex items-center gap-1">
                      <span className="h-px w-2 bg-border" />
                      <span>{mark}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="text-muted-foreground text-xs">
                {liters}/{tank.capacity_l} L
              </div>
            </CardContent>
            <div className="flex justify-center border-t px-3 py-1.5">
              <ConfigureButton size="sm" />
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/** Variant B — compact horizontal row: thin fill bar, dense, kiosk-glanceable. */
export function VariantB({ tanks }: { tanks: Record<string, Tank> }) {
  const ids = orderedIds(tanks)
  return (
    <div className="flex flex-col gap-3">
      {ids.map((id) => {
        const tank = tanks[id]
        const ok = tank.status === 'ok'
        const pct = Math.min(100, Math.max(0, tank.level_pct))
        const liters = Math.round((tank.capacity_l * tank.level_pct) / 100)
        return (
          <Card key={id}>
            <CardContent className="flex flex-row items-center gap-4 py-3">
              <div className="relative h-16 w-6 shrink-0 overflow-hidden rounded-full border bg-[var(--panel-2)]">
                <div
                  className="absolute inset-x-0 bottom-0"
                  style={{ height: `${pct}%`, background: ok ? 'var(--kiosk-accent)' : 'var(--bad)' }}
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
      })}
    </div>
  )
}

/** Variant C — numeric-first: giant % headline, horizontal capacity bar, no tank silhouette. */
export function VariantC({ tanks }: { tanks: Record<string, Tank> }) {
  const ids = orderedIds(tanks)
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
      {ids.map((id) => {
        const tank = tanks[id]
        const ok = tank.status === 'ok'
        const pct = Math.min(100, Math.max(0, tank.level_pct))
        const liters = Math.round((tank.capacity_l * tank.level_pct) / 100)
        return (
          <Card key={id}>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{FLUID_LABELS[tank.fluid_type]}</div>
                  <div className="text-muted-foreground text-xs">{id}</div>
                </div>
                <Badge variant={ok ? 'success' : 'destructive'}>{ok ? 'Normal' : 'Fault'}</Badge>
              </div>
              <div className="text-5xl font-bold tabular-nums" style={{ color: ok ? 'var(--kiosk-accent)' : 'var(--bad)' }}>
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
      })}
    </div>
  )
}
