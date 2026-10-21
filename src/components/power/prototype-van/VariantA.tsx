// PROTOTYPE: throwaway. Variant A "Hub": the van is the centre column of a three-column row.
// Sources stack on the left and feed its rear; the van's nose feeds the loads on the right.
// SOC is the van's own fill. Straight rails, no elbows.

import { Engine, Plug2, PlugZap, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { flowSeconds, formatPower, IDLE_W, type NodeId, type PowerSnapshot } from '../flowModel'
import { RollingNumber, Value } from '../PowerValue'
import { VanArt } from './VanArt'
import { BatteryState } from './BatteryState'

const ICON: Partial<Record<NodeId, ReactNode>> = {
  solar: <Sun className="size-9" />,
  alternator: <Engine className="size-9" />,
  shore: <PlugZap className="size-9" />,
  loads: <Plug2 className="size-9" />,
}

function Rail({ watts, peakW }: { watts: number; peakW: number }) {
  const reduce = useReducedMotion()
  const live = watts > IDLE_W
  return (
    <div className="relative h-1 min-w-10 flex-1 rounded-full bg-[var(--border)]">
      {live ? (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, var(--accent) 0 6px, transparent 6px 22px)',
            filter: 'drop-shadow(0 0 4px var(--accent))',
          }}
          animate={reduce ? undefined : { backgroundPositionX: ['0px', '22px'] }}
          transition={{ duration: flowSeconds(watts, peakW) / 6, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}
    </div>
  )
}

function Chip({ id, flow }: { id: NodeId; flow: PowerSnapshot }) {
  const n = flow.nodes[id]
  const p = formatPower(n.watts)
  return (
    <div className="bg-surface flex min-h-24 items-center gap-4 rounded-3xl px-5">
      <span className="text-accent">{ICON[id]}</span>
      <div className="flex flex-col">
        <span className="text-muted text-lg">{n.label}</span>
        <Value value={<RollingNumber value={n.watts} />} unit={p.unit} />
      </div>
    </div>
  )
}

export function VariantA({ flow }: { flow: PowerSnapshot }) {
  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const bat = flow.nodes.battery
  const bp = formatPower(bat.watts === undefined ? undefined : Math.abs(bat.watts))
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  return (
    <div data-testid="power-van-a" className="flex min-h-0 flex-1 items-center">
      <div className="flex w-[34%] shrink-0 flex-col gap-4">
        {sources.map((id) => (
          <div key={id} className="flex items-center gap-2">
            <Chip id={id} flow={flow} />
            <Rail watts={flow.nodes[id].watts ?? 0} peakW={flow.peakW} />
          </div>
        ))}
      </div>
      <div className="relative z-10 -mx-6 flex min-w-0 flex-1 flex-col items-center gap-3">
        <VanArt flow={flow} className="w-full" />
        <div className="flex items-baseline gap-4">
          <Value
            value={flow.soc === undefined ? '—' : Math.round(flow.soc)}
            unit={flow.soc === undefined ? '' : '%'}
            sizeClass={['text-7xl', 'text-4xl']}
          />
          <span className="text-muted text-2xl tabular-nums">
            {bat.watts !== undefined && bat.watts < 0 ? '−' : '+'}
            {bp.value} {bp.unit}
          </span>
        </div>
        <BatteryState flow={flow} />
      </div>
      <div className="flex w-[34%] shrink-0 items-center gap-2">
        <Rail watts={out} peakW={flow.peakW} />
        <Chip id="loads" flow={flow} />
      </div>
    </div>
  )
}
