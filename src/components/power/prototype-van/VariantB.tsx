// PROTOTYPE: throwaway. Variant B "Cutaway": the van spans the page. Sources sit in a row ABOVE it
// and their wires drop into the roof; loads sit in a row BELOW and their wires leave through the
// floor. SOC% is printed inside the body. Vertical flow, so the whole thing reads top -> bottom.

import { Engine, Plug2, PlugZap, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { flowSeconds, formatPower, IDLE_W, type NodeId, type PowerSnapshot } from '../flowModel'
import { RollingNumber, Value } from '../PowerValue'
import { VanArt } from './VanArt'
import { BatteryState } from './BatteryState'

const ICON: Partial<Record<NodeId, ReactNode>> = {
  solar: <Sun className="size-8" />,
  alternator: <Engine className="size-8" />,
  shore: <PlugZap className="size-8" />,
  loads: <Plug2 className="size-8" />,
}

/** A short vertical wire; dashes crawl down (`dir` 1) or up (`dir` -1). */
function Drop({ watts, peakW }: { watts: number; peakW: number }) {
  const reduce = useReducedMotion()
  return (
    <div className="relative mx-auto h-10 w-1 rounded-full bg-[var(--border)]">
      {watts > IDLE_W ? (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            backgroundImage:
              'repeating-linear-gradient(180deg, var(--accent) 0 6px, transparent 6px 20px)',
            filter: 'drop-shadow(0 0 4px var(--accent))',
          }}
          animate={reduce ? undefined : { backgroundPositionY: ['0px', '20px'] }}
          transition={{ duration: flowSeconds(watts, peakW) / 6, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}
    </div>
  )
}

function Pill({ id, flow }: { id: NodeId; flow: PowerSnapshot }) {
  const n = flow.nodes[id]
  const p = formatPower(n.watts)
  return (
    <div className="flex flex-col items-stretch">
      <div className="bg-surface flex min-h-16 items-center justify-center gap-3 rounded-3xl px-6">
        <span className="text-accent">{ICON[id]}</span>
        <span className="text-muted text-base">{n.label}</span>
        <Value
          value={<RollingNumber value={n.watts} />}
          unit={p.unit}
          sizeClass={['text-3xl', 'text-lg']}
        />
      </div>
      <Drop watts={n.watts ?? 0} peakW={flow.peakW} />
    </div>
  )
}

export function VariantB({ flow }: { flow: PowerSnapshot }) {
  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const bat = flow.nodes.battery
  const bp = formatPower(bat.watts === undefined ? undefined : Math.abs(bat.watts))
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  const lp = formatPower(flow.nodes.loads.watts)
  return (
    <div
      data-testid="power-van-b"
      className="flex min-h-0 flex-1 flex-col items-center justify-center pb-16"
    >
      <div className="flex w-full max-w-4xl justify-around gap-4">
        {sources.map((id) => (
          <Pill key={id} id={id} flow={flow} />
        ))}
      </div>
      <div className="relative flex min-h-0 w-full max-w-4xl flex-1 items-center justify-center">
        <VanArt flow={flow} className="h-full w-auto max-w-full" />
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pr-10 pb-6">
          <Value
            value={flow.soc === undefined ? '—' : Math.round(flow.soc)}
            unit={flow.soc === undefined ? '' : '%'}
            sizeClass={['text-8xl', 'text-5xl']}
          />
          <span className="text-foreground text-2xl tabular-nums">
            {bat.watts !== undefined && bat.watts < 0 ? '−' : '+'}
            {bp.value} {bp.unit}
          </span>
          <BatteryState flow={flow} />
        </div>
      </div>
      <div className="flex w-full max-w-4xl flex-col items-center">
        <Drop watts={out} peakW={flow.peakW} />
        <div className="bg-surface flex min-h-16 items-center justify-center gap-3 rounded-3xl px-6">
          <span className="text-accent">{ICON.loads}</span>
          <span className="text-muted text-base">Loads</span>
          <Value
            value={<RollingNumber value={flow.nodes.loads.watts} />}
            unit={lp.unit}
            sizeClass={['text-3xl', 'text-lg']}
          />
        </div>
      </div>
    </div>
  )
}
