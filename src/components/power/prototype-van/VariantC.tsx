// PROTOTYPE: throwaway. Variant C "Ported": one SVG, no cards. The van sits in the middle of a
// wide canvas; each source plugs into its own PORT on the body (solar -> roof, alternator -> rear,
// shore -> side socket) with a curved wire, and the loads leave from the nose. Endpoints are bare
// labelled readings. SOC is a thin ring-less bar under the van, so the van stays the hero.

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Engine, Plug2, PlugZap, Sun } from 'lucide-react'
import { flowSeconds, formatPower, IDLE_W, type NodeId, type PowerSnapshot } from '../flowModel'
import { RollingNumber, Value } from '../PowerValue'
import { ChargeBar } from './ChargeBar'
import { VanArt } from './VanArt'
import { BatteryState } from './BatteryState'

const ICON: Partial<Record<NodeId, ReactNode>> = {
  solar: <Sun className="size-5" />,
  alternator: <Engine className="size-5" />,
  shore: <PlugZap className="size-5" />,
  loads: <Plug2 className="size-5" />,
}

// Canvas units. The van is drawn as an HTML overlay positioned to match VAN_BOX.
const W = 1200
// The content's extent in canvas units, from the layout below: the Solar tile's top edge down to
// the Shore tile's bottom edge. The visible band adds an equal margin to both, so the `items-center`
// parent centres the content (not the canvas) in the view space.
const CONTENT_TOP = 20
const CONTENT_BOTTOM = 470 + 60
const MARGIN = 30
const VIEW_TOP = CONTENT_TOP - MARGIN
const VIEW_H = CONTENT_BOTTOM - CONTENT_TOP + 2 * MARGIN
const VAN_BOX = { x: 410, y: 210, w: 380 } // h derived from the 113.312:68.002 ratio
const k = VAN_BOX.w / 113.312
const at = (px: number, py: number) => ({ x: VAN_BOX.x + px * k, y: VAN_BOX.y + py * k })

type Anchor = {
  port: { x: number; y: number }
  end: { x: number; y: number }
  side: 'l' | 'r' | 't'
}

// `end` is where the wire starts: the tile's inner edge (left/right) or bottom edge (top).
const TILE_W = 230
const TILE_H = 120
const ANCHORS: Partial<Record<NodeId, Anchor>> = {
  solar: {
    port: at(113.312 / 2, 1.25),
    end: { x: VAN_BOX.x + VAN_BOX.w / 2, y: 20 + TILE_H },
    side: 't',
  },
  alternator: { port: at(3.7, 26), end: { x: 30 + TILE_W, y: 150 }, side: 'l' },
  shore: { port: at(2, 55), end: { x: 30 + TILE_W, y: 470 }, side: 'l' },
  loads: { port: at(108.7, 26), end: { x: W - 30 - TILE_W, y: 150 }, side: 'r' },
}

function wire(a: Anchor, reverse: boolean) {
  const { port: p, end: e } = a
  const [s, t] = reverse ? [p, e] : [e, p]
  const horizontal = a.side !== 't'
  return horizontal
    ? `M${s.x} ${s.y} C ${(s.x + t.x) / 2} ${s.y}, ${(s.x + t.x) / 2} ${t.y}, ${t.x} ${t.y}`
    : `M${s.x} ${s.y} C ${s.x} ${(s.y + t.y) / 2}, ${t.x} ${(s.y + t.y) / 2}, ${t.x} ${t.y}`
}

function Wire({ d, watts, peakW }: { d: string; watts: number; peakW: number }) {
  const reduce = useReducedMotion()
  return (
    <>
      <path d={d} fill="none" stroke="var(--border)" strokeWidth={4} strokeLinecap="round" />
      {watts > IDLE_W ? (
        <motion.path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={5}
          strokeLinecap="round"
          strokeDasharray="3 21"
          style={{ filter: 'drop-shadow(0 0 5px var(--accent))' }}
          animate={reduce ? undefined : { strokeDashoffset: [0, -24] }}
          transition={{ duration: flowSeconds(watts, peakW) / 6, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}
    </>
  )
}

export function VariantC({ flow }: { flow: PowerSnapshot }) {
  const ids = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  const all: NodeId[] = [...ids, 'loads']
  const bat = flow.nodes.battery
  const bp = formatPower(bat.watts === undefined ? undefined : Math.abs(bat.watts))
  return (
    <div
      data-testid="power-van-c"
      className="flex min-h-0 flex-1 items-center justify-center pb-16"
    >
      <div
        className="relative max-h-full w-full max-w-6xl"
        style={{ aspectRatio: `${W} / ${VIEW_H}` }}
      >
        <svg
          viewBox={`0 ${VIEW_TOP} ${W} ${VIEW_H}`}
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          {all.map((id) => {
            const a = ANCHORS[id]!
            const isLoad = id === 'loads'
            const watts = isLoad ? out : (flow.nodes[id].watts ?? 0)
            return (
              <g key={id}>
                <Wire d={wire(a, isLoad)} watts={watts} peakW={flow.peakW} />
                <circle cx={a.port.x} cy={a.port.y} r={9} fill="var(--accent)" />
              </g>
            )
          })}
          {all.map((id) => {
            const a = ANCHORS[id]!
            const n = flow.nodes[id]
            const p = formatPower(n.watts)
            const watts = id === 'loads' ? out : (n.watts ?? 0)
            const active = watts > IDLE_W
            const x = a.side === 'r' ? W - 30 - TILE_W : a.side === 'l' ? 30 : a.end.x - TILE_W / 2
            const y = a.side === 't' ? 20 : a.end.y - TILE_H / 2
            return (
              <foreignObject key={`t-${id}`} x={x} y={y} width={TILE_W} height={TILE_H}>
                <div
                  className="bg-surface flex size-full flex-col justify-center rounded-3xl border-2 px-5"
                  style={{
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    boxShadow: active
                      ? '0 0 22px 2px color-mix(in oklch, var(--accent) 45%, transparent)'
                      : 'none',
                  }}
                >
                  <div className="text-muted flex items-center gap-2 text-base">
                    {ICON[id]}
                    {n.label}
                  </div>
                  <Value
                    value={<RollingNumber value={n.watts} />}
                    unit={p.unit}
                    sizeClass={['text-5xl', 'text-xl']}
                  />
                </div>
              </foreignObject>
            )
          })}
        </svg>
        <div
          className="absolute"
          style={{
            left: `${(VAN_BOX.x / W) * 100}%`,
            top: `${((VAN_BOX.y - VIEW_TOP) / VIEW_H) * 100}%`,
            width: `${(VAN_BOX.w / W) * 100}%`,
          }}
        >
          <VanArt flow={flow} className="w-full" />
          <div className="mt-3 flex items-center justify-center gap-4">
            <ChargeBar soc={flow.soc} className="w-2/3" />
            <span className="text-foreground text-xl tabular-nums">
              {flow.soc === undefined ? '—' : `${Math.round(flow.soc)}%`}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-center gap-3 whitespace-nowrap">
            <span className="text-muted tabular-nums">
              {bat.watts !== undefined && bat.watts < 0 ? '−' : '+'}
              {bp.value} {bp.unit}
            </span>
            <BatteryState flow={flow} />
          </div>
        </div>
      </div>
    </div>
  )
}
