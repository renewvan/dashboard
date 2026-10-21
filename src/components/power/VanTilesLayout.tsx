// The Power page's Van tiles layout: the van is the hub. Each source is a bordered tile that plugs
// into its own port on the van's body (solar -> roof, alternator and shore -> left side), and the
// loads tile hangs off a port on the right. The accent border and glow on a tile, like the dashes
// on its wire, show power moving through it.
//
// Everything is drawn in one SVG in canvas units (W by the content's height); the van is an HTML
// block positioned over it as a share of the same box.

import type { ReactNode } from 'react'
import { Engine, Plug2, PlugZap, Sun } from 'lucide-react'
import { formatPower, IDLE_W, type NodeId, type PowerSnapshot } from './flowModel'
import { RollingNumber, Value } from './PowerValue'
import { PortDomes, VanHub, Wire } from './VanDiagram'
import { wirePath, type Point, type PortSide } from './vanGeometry'

const ICON: Partial<Record<NodeId, ReactNode>> = {
  solar: <Sun className="size-5" />,
  alternator: <Engine className="size-5" />,
  shore: <PlugZap className="size-5" />,
  loads: <Plug2 className="size-5" />,
}

// Canvas units. The van is an HTML block positioned to match VAN_BOX.
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
const at = (px: number, py: number): Point => ({ x: VAN_BOX.x + px * k, y: VAN_BOX.y + py * k })

interface Anchor {
  /** The port on the van. */
  port: Point
  /** Where the wire starts: the tile's inner edge (left/right) or bottom edge (top). */
  end: Point
  side: PortSide
}

const TILE_W = 230
const TILE_H = 120
const ANCHORS: Partial<Record<NodeId, Anchor>> = {
  solar: {
    port: at(113.312 / 2, 1.25),
    end: { x: VAN_BOX.x + VAN_BOX.w / 2, y: 20 + TILE_H },
    side: 't',
  },
  alternator: { port: at(3.7, 26), end: { x: 30 + TILE_W, y: 150 }, side: 'l' },
  shore: { port: at(1.25, 55.3), end: { x: 30 + TILE_W, y: 470 }, side: 'l' },
  loads: { port: at(108.68, 34), end: { x: W - 30 - TILE_W, y: 150 }, side: 'r' },
}

export function VanTilesLayout({ flow }: { flow: PowerSnapshot }) {
  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  const all: NodeId[] = [...sources, 'loads']
  const viewBox = `0 ${VIEW_TOP} ${W} ${VIEW_H}`
  return (
    <div
      data-testid="power-van-tiles"
      className="flex min-h-0 flex-1 items-center justify-center pb-16"
    >
      <div className="relative h-full max-w-full" style={{ aspectRatio: `${W} / ${VIEW_H}` }}>
        <svg viewBox={viewBox} className="absolute inset-0 size-full" aria-hidden="true">
          {all.map((id) => {
            const a = ANCHORS[id]!
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
            const a = ANCHORS[id]!
            const n = flow.nodes[id]
            const p = formatPower(n.watts)
            const watts = id === 'loads' ? out : (n.watts ?? 0)
            const active = watts > IDLE_W
            const x = a.side === 'r' ? W - 30 - TILE_W : a.side === 'l' ? 30 : a.end.x - TILE_W / 2
            const y = a.side === 't' ? 20 : a.end.y - TILE_H / 2
            return (
              <foreignObject key={id} x={x} y={y} width={TILE_W} height={TILE_H}>
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
