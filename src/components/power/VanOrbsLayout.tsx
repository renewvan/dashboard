// The Power page's Van orbs layout: the van is the hub, and each source and the loads is a round
// orb (a hollow ring, an accent arc for its share of the peak, the icon, the number, and its label
// inside the ring). Wires run from each orb into a port on the van's body; the van carries the
// charge, so there is no Battery orb.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Engine, Plug2, PlugZap, Sun } from 'lucide-react'
import { formatPower, IDLE_W, type NodeId, type PowerSnapshot } from './flowModel'
import { RollingNumber, Value } from './PowerValue'
import { PortDomes, VanHub, Wire } from './VanDiagram'
import { wirePath, type Point, type PortSide } from './vanGeometry'

const ICON: Partial<Record<NodeId, ReactNode>> = {
  solar: <Sun className="size-12" />,
  alternator: <Engine className="size-12" />,
  shore: <PlugZap className="size-12" />,
  loads: <Plug2 className="size-12" />,
}

/** Orb radius in canvas units. Smaller than Orbs' 230: a van and four orbs share the canvas. */
const R = 150
const CIRC = 2 * Math.PI * R
const ORB_VALUE = ['text-7xl', 'text-3xl'] as const

const W = 1500
/** Empty space between the roof and the Solar orb above it, measured for the original 330 van. */
const SOLAR_GAP = 94

// The van is the fixed centre: x = W / 2 always, and the canvas is symmetric about it.
//
//   Solar                              over the van
//   Alternator --- [ VAN ] --- Loads   at fixed positions, wires run to the van's ports
//   Shore                              below Alternator
const VAN_W_UNITS = 420
const VAN_H_UNITS = (VAN_W_UNITS * 68.002) / 113.312
/** The bar, the watts line and the state line under the van. */
const VAN_STACK_H = 100
const k = VAN_W_UNITS / 113.312

// The orbs were laid out around a 330-wide van; these are the positions that gave, kept fixed.
const ORIG_VAN_W = 330
const ORIG_K = ORIG_VAN_W / 113.312
const ORB_LEFT_X = (W - ORIG_VAN_W) / 2 - 240 - R
const ORB_RIGHT_X = (W + ORIG_VAN_W) / 2 + 240 + R
const ORB_SIDE_Y = 26 * ORIG_K

// Vertical layout in a local frame with the van's top at y=0; the band is then centred on it. The
// orbs sit at fixed positions (pinned from a 330-wide van's layout), so the van can be resized
// without moving them: only the van and its ports scale.
const SOLAR_Y = -(R + SOLAR_GAP)
const SIDE_Y = ORB_SIDE_Y
/** Alternator and Shore mirror each other about the side row, 1.5 orb radii away. */
const ALT_Y = SIDE_Y - 1.5 * R
const SHORE_Y = SIDE_Y + 1.5 * R
const VAN_X = (W - VAN_W_UNITS) / 2
const at = (px: number, py: number): Point => ({ x: VAN_X + px * k, y: py * k })

interface Spot {
  /** Orb centre. */
  c: Point
  /** Port on the van the wire plugs into. */
  port: Point
  /** Which edge of the orb the wire leaves from. */
  side: PortSide
}

const SPOTS: Partial<Record<NodeId, Spot>> = {
  solar: { c: { x: W / 2, y: SOLAR_Y }, port: at(113.312 / 2, 1.25), side: 't' },
  alternator: { c: { x: ORB_LEFT_X, y: ALT_Y }, port: at(3.7, 26), side: 'l' },
  shore: { c: { x: ORB_LEFT_X, y: SHORE_Y }, port: at(1.25, 55.3), side: 'l' },
  loads: { c: { x: ORB_RIGHT_X, y: SIDE_Y }, port: at(108.68, 34), side: 'r' },
}

// The visible band is symmetric about the van's vertical centre, so the van sits in the middle of
// the view (and, by VAN_X, of its width) whatever the orbs show. Its half-height is the larger of
// the reach above the van's centre (to the top of the Solar orb) and below it (to the Shore orb or
// the van's text stack), plus a margin.
const VAN_CY = VAN_H_UNITS / 3
const REACH_UP = VAN_CY - Math.min(SOLAR_Y - R, ALT_Y - R)
const REACH_DOWN = Math.max(SHORE_Y + R, VAN_H_UNITS + VAN_STACK_H) - VAN_CY
const MARGIN = 30
const HALF = Math.max(REACH_UP, REACH_DOWN) + MARGIN
const VIEW_TOP = VAN_CY - HALF
const VIEW_H = 2 * HALF
const VIEW_BOX = `0 ${VIEW_TOP} ${W} ${VIEW_H}`

/**
 * Where the wire leaves the orb: the point of its ring nearest the van along its side. Solar's wire
 * leaves downward, below its label, so the label never sits on the dashes.
 */
function edge({ c, side }: Spot): Point {
  if (side === 'l') return { x: c.x + R, y: c.y }
  if (side === 'r') return { x: c.x - R, y: c.y }
  return { x: c.x, y: c.y + R }
}

function Orb({
  id,
  spot,
  label,
  watts,
  shown,
  peakW,
}: {
  id: NodeId
  spot: Spot
  label: string
  /** What the wire carries: drives the arc and the glow. */
  watts: number
  /** What the orb reads out (undefined = not published). */
  shown: number | undefined
  peakW: number
}) {
  const { x, y } = spot.c
  const p = formatPower(shown)
  const share = Math.min(1, Math.abs(watts) / peakW)
  const active = watts > IDLE_W
  const colour = 'var(--accent)'
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={R}
        fill="var(--surface)"
        stroke={colour}
        strokeOpacity={0.25}
        strokeWidth={6}
      />
      <motion.circle
        cx={x}
        cy={y}
        r={R}
        fill="none"
        stroke={colour}
        strokeWidth={6}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        transform={`rotate(-90 ${x} ${y})`}
        initial={{ strokeDashoffset: CIRC }}
        animate={{ strokeDashoffset: CIRC * (1 - share) }}
        transition={{ type: 'spring', stiffness: 50, damping: 16 }}
        style={{ filter: active ? `drop-shadow(0 0 5px ${colour})` : 'none' }}
      />
      <foreignObject x={x - R} y={y - R} width={R * 2} height={R * 2}>
        <div className="text-foreground flex size-full flex-col items-center justify-center">
          <span className="mb-2" style={{ color: colour }}>
            {ICON[id]}
          </span>
          <Value sizeClass={ORB_VALUE} value={<RollingNumber value={shown} />} unit={p.unit} />
          <span className="text-muted mt-2 text-3xl">{label}</span>
        </div>
      </foreignObject>
    </g>
  )
}

export function VanOrbsLayout({ flow }: { flow: PowerSnapshot }) {
  const ids = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  const all: NodeId[] = [...ids, 'loads']
  const wattsOf = (id: NodeId) => (id === 'loads' ? out : (flow.nodes[id].watts ?? 0))
  return (
    <div data-testid="power-van-orbs" className="flex min-h-0 flex-1 items-center justify-center">
      <div className="relative h-full max-w-full" style={{ aspectRatio: `${W} / ${VIEW_H}` }}>
        <svg viewBox={VIEW_BOX} className="absolute inset-0 size-full" aria-hidden="true">
          {all.map((id) => {
            const s = SPOTS[id]!
            return (
              <Wire
                key={id}
                d={wirePath(edge(s), s.port, s.side, id === 'loads')}
                watts={wattsOf(id)}
                peakW={flow.peakW}
              />
            )
          })}
          {all.map((id) => (
            <Orb
              key={id}
              id={id}
              spot={SPOTS[id]!}
              label={flow.nodes[id].label}
              watts={wattsOf(id)}
              shown={flow.nodes[id].watts}
              peakW={flow.peakW}
            />
          ))}
        </svg>
        <VanHub
          flow={flow}
          left={`${(VAN_X / W) * 100}%`}
          top={`${((0 - VIEW_TOP) / VIEW_H) * 100}%`}
          width={`${(VAN_W_UNITS / W) * 100}%`}
          compact
        />
        <PortDomes ports={all.map((id) => SPOTS[id]!)} viewBox={VIEW_BOX} />
      </div>
    </div>
  )
}
