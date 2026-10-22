// The Power page's Van tiles layout: the van is the hub. Each source is a bordered tile that plugs
// into its own port on the van's body (solar -> roof, alternator and shore -> left side), and the
// loads tile hangs off a port on the right. The accent border and glow on a tile, like the dashes
// on its wire, show power moving through it.
//
// Everything is drawn in one SVG in canvas units (W by the content's height); the van is an HTML
// block positioned over it as a share of the same box.

import type { ReactNode } from 'react'
import { Engine, Plug2, PlugZap, SolarPanel } from 'lucide-react'
import { formatPower, IDLE_W, type NodeId, type PowerSnapshot } from './flowModel'
import { RollingNumber, Value } from './PowerValue'
import { PortDomes, VanHub, Wire } from './VanDiagram'
import { VAN_FRAME, wirePath, type Point, type PortSide } from './vanGeometry'
import { SolarHistory } from '@/components/widgets/solar/SolarHistory'
import { yieldHistoryView } from '@/components/widgets/solar/solarView'
import type { Solar } from '@/types'

const ICON: Partial<Record<NodeId, ReactNode>> = {
  solar: <SolarPanel className="size-8" />,
  alternator: <Engine className="size-8" />,
  shore: <PlugZap className="size-8" />,
  loads: <Plug2 className="size-8" />,
}

// Canvas units, shared with Van orbs (VAN_FRAME) so the van is the same size and place in both. The
// van is an HTML block positioned to match VAN_BOX.
const W = VAN_FRAME.w
// The band is the content's extent in canvas units, from the layout below (the Solar tile's top
// edge, y=20, down to the Shore tile's bottom edge, y=530) plus an equal 30-unit margin each side,
// so the `items-center` parent centres the content (not the canvas) in the view space.
const VIEW_TOP = VAN_FRAME.top
const VIEW_H = VAN_FRAME.h
const VAN_BOX = VAN_FRAME.van
const k = VAN_BOX.w / 113.312
const at = (px: number, py: number): Point => ({ x: VAN_BOX.x + px * k, y: VAN_BOX.y + py * k })

interface Anchor {
  /** The port on the van. */
  port: Point
  /** Where the wire starts: the tile's inner edge (left/right) or bottom edge (top). */
  end: Point
  side: PortSide
}

const TILE_W = 250
const TILE_H = 120
/** The Solar tile is taller and wider than the rest: its week of harvest is a row under the value. */
const SOLAR_TILE_W = 320
const SOLAR_TILE_H = 210
const ANCHORS: Partial<Record<NodeId, Anchor>> = {
  solar: {
    port: at(113.312 / 2, 1.25),
    end: { x: VAN_BOX.x + VAN_BOX.w / 2, y: 20 + SOLAR_TILE_H },
    side: 't',
  },
  alternator: { port: at(3.7, 26), end: { x: 30 + TILE_W, y: 150 }, side: 'l' },
  shore: { port: at(1.25, 55.3), end: { x: 30 + TILE_W, y: 470 }, side: 'l' },
  loads: { port: at(108.68, 34), end: { x: W - 30 - TILE_W, y: 150 }, side: 'r' },
}

export function VanTilesLayout({
  flow,
  solar,
}: {
  flow: PowerSnapshot
  /** Absent until a solar controller has published its required fields: then no history is drawn. */
  solar?: Solar
}) {
  const solarHistory = yieldHistoryView(solar?.yield_history_wh)
  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  const all: NodeId[] = [...sources, 'loads']
  const viewBox = `0 ${VIEW_TOP} ${W} ${VIEW_H}`
  const solarH = solarHistory ? SOLAR_TILE_H : TILE_H
  const anchorOf = (id: NodeId): Anchor => {
    const a = ANCHORS[id]!
    return id === 'solar' ? { ...a, end: { ...a.end, y: 20 + solarH } } : a
  }
  return (
    <div
      data-testid="power-van-tiles"
      className="flex min-h-0 flex-1 items-center justify-center pb-16"
    >
      <div className="relative h-full max-w-full" style={{ aspectRatio: `${W} / ${VIEW_H}` }}>
        <svg viewBox={viewBox} className="absolute inset-0 size-full" aria-hidden="true">
          {all.map((id) => {
            const a = anchorOf(id)
            const isLoad = id === 'loads'
            const watts = isLoad ? out : (flow.nodes[id].watts ?? 0)
            return (
              <Wire
                key={id}
                d={wirePath(a.end, a.port, a.side, isLoad)}
                watts={watts}
                peakW={flow.peakW}
              />
            )
          })}
          {all.map((id) => {
            const a = anchorOf(id)
            const n = flow.nodes[id]
            const p = formatPower(n.watts)
            const watts = id === 'loads' ? out : (n.watts ?? 0)
            const active = watts > IDLE_W
            const isSolar = id === 'solar'
            const w = isSolar ? SOLAR_TILE_W : TILE_W
            const h = isSolar ? solarH : TILE_H
            const x = a.side === 'r' ? W - 30 - w : a.side === 'l' ? 30 : a.end.x - w / 2
            const y = a.side === 't' ? 20 : a.end.y - h / 2
            return (
              <foreignObject key={id} x={x} y={y} width={w} height={h}>
                <div
                  className="bg-surface flex size-full flex-col justify-center rounded-3xl border-2 px-5"
                  style={{
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    boxShadow: active
                      ? '0 0 22px 2px color-mix(in oklch, var(--accent) 45%, transparent)'
                      : 'none',
                  }}
                >
                  <div className="text-muted mb-2 flex items-center gap-2 text-xl">
                    {ICON[id]}
                    {n.label}
                  </div>
                  <Value
                    value={<RollingNumber value={n.watts} />}
                    unit={p.unit}
                    sizeClass={['text-5xl', 'text-xl']}
                  />
                  {isSolar && solarHistory ? (
                    <div className="mt-6 h-14 min-h-0">
                      <SolarHistory view={solarHistory} />
                    </div>
                  ) : null}
                </div>
              </foreignObject>
            )
          })}
        </svg>
        <VanHub
          flow={flow}
          left={`${(VAN_BOX.x / W) * 100}%`}
          top={`${((VAN_BOX.y - VIEW_TOP) / VIEW_H) * 100}%`}
          width={`${(VAN_BOX.w / W) * 100}%`}
        />
        <PortDomes ports={all.map((id) => ANCHORS[id]!)} viewBox={viewBox} />
      </div>
    </div>
  )
}
