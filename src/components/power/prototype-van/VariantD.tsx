// PROTOTYPE: throwaway. Variant D "Ported, Orbs": variant C's idea (wires plug into ports on the
// van) with the Orbs layout's endpoints instead of Tiles' boxes. Each source and the loads is a
// round orb: a hollow ring, an accent arc for its share of the peak, the icon, the number, and its
// label outside the ring. The van replaces the Battery orb; its charge is the van's own fill.

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Engine, Plug2, PlugZap, Sun } from 'lucide-react'
import { flowSeconds, formatPower, IDLE_W, type NodeId, type PowerSnapshot } from '../flowModel'
import { RollingNumber, Value } from '../PowerValue'
import { ChargeBar } from './ChargeBar'
import { BatteryState } from './BatteryState'
import { VanArt } from './VanArt'

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
//   Solar (label below)                over the van
//   Alternator --- [ VAN ] --- Loads   at fixed positions, wires run to the van's ports
//   Shore                              below Alternator, its label under it
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
const at = (px: number, py: number) => ({ x: VAN_X + px * k, y: py * k })

type Side = 'l' | 'r' | 't'
interface Spot {
  /** Orb centre. */
  c: { x: number; y: number }
  /** Port on the van the wire plugs into. */
  port: { x: number; y: number }
  /** Which edge of the orb the wire leaves from; Solar's label sits right, the rest's below. */
  side: Side
}

const LEFT_X = ORB_LEFT_X
const RIGHT_X = ORB_RIGHT_X
const SPOTS: Partial<Record<NodeId, Spot>> = {
  solar: { c: { x: W / 2, y: SOLAR_Y }, port: at(113.312 / 2, 1.25), side: 't' },
  alternator: { c: { x: LEFT_X, y: ALT_Y }, port: at(3.7, 26), side: 'l' },
  shore: { c: { x: LEFT_X, y: SHORE_Y }, port: at(1.25, 55.3), side: 'l' },
  loads: { c: { x: RIGHT_X, y: SIDE_Y }, port: at(108.68, 34), side: 'r' },
}

// The visible band is symmetric about the van's vertical centre, so the van sits in the middle of
// the view (and, by VAN_X, of its width) whatever the orbs show. Its half-height is the larger of
// the reach above the van's centre (to the top of the Solar orb) and below it (to the Shore label
// or the van's text stack), plus a margin.
const VAN_CY = VAN_H_UNITS / 3
const REACH_UP = VAN_CY - Math.min(SOLAR_Y - R, ALT_Y - R)
const REACH_DOWN = Math.max(SHORE_Y + R, VAN_H_UNITS + VAN_STACK_H) - VAN_CY
const MARGIN = 30
const HALF = Math.max(REACH_UP, REACH_DOWN) + MARGIN
const VIEW_TOP = VAN_CY - HALF
const VIEW_H = 2 * HALF

/**
 * Where the wire leaves the orb: the point of its ring nearest the van along its side. Solar's wire
 * leaves downward, below its label, so the label never sits on the dashes.
 */
function edge(s: Spot) {
  if (s.side === 'l') return { x: s.c.x + R, y: s.c.y }
  if (s.side === 'r') return { x: s.c.x - R, y: s.c.y }
  return { x: s.c.x, y: s.c.y + R }
}

function wire(s: Spot, reverse: boolean) {
  const e = edge(s)
  const [a, b] = reverse ? [s.port, e] : [e, s.port]
  return s.side === 't'
    ? `M${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`
    : `M${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`
}

/** A semicircle on the van's outline at the port, bulging away from the van. */
const DOME_R = 9
function dome(s: Spot) {
  const { x, y } = s.port
  if (s.side === 'l') return `M${x} ${y - DOME_R} A${DOME_R} ${DOME_R} 0 0 0 ${x} ${y + DOME_R} Z`
  if (s.side === 'r') return `M${x} ${y - DOME_R} A${DOME_R} ${DOME_R} 0 0 1 ${x} ${y + DOME_R} Z`
  return `M${x - DOME_R} ${y} A${DOME_R} ${DOME_R} 0 0 1 ${x + DOME_R} ${y} Z`
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

export function VariantD({ flow }: { flow: PowerSnapshot }) {
  const ids = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const out = flow.edges.find((e) => e.to === 'loads')?.watts ?? 0
  const all: NodeId[] = [...ids, 'loads']
  const bat = flow.nodes.battery
  const bp = formatPower(bat.watts === undefined ? undefined : Math.abs(bat.watts))
  return (
    <div data-testid="power-van-d" className="flex min-h-0 flex-1 items-center justify-center">
      <div className="relative h-full max-w-full" style={{ aspectRatio: `${W} / ${VIEW_H}` }}>
        <svg
          viewBox={`0 ${VIEW_TOP} ${W} ${VIEW_H}`}
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          {all.map((id) => {
            const s = SPOTS[id]!
            const isLoad = id === 'loads'
            const watts = isLoad ? out : (flow.nodes[id].watts ?? 0)
            return (
              <g key={id}>
                <Wire d={wire(s, isLoad)} watts={watts} peakW={flow.peakW} />
              </g>
            )
          })}
          {all.map((id) => {
            const n = flow.nodes[id]
            const watts = id === 'loads' ? out : (n.watts ?? 0)
            return (
              <Orb
                key={id}
                id={id}
                spot={SPOTS[id]!}
                label={n.label}
                watts={watts}
                shown={n.watts}
                peakW={flow.peakW}
              />
            )
          })}
        </svg>
        <div
          className="absolute"
          style={{
            left: `${(VAN_X / W) * 100}%`,
            top: `${((0 - VIEW_TOP) / VIEW_H) * 100}%`,
            width: `${(VAN_W_UNITS / W) * 100}%`,
          }}
        >
          <VanArt flow={flow} className="w-full" />
          <div className="mt-3 flex items-center justify-center gap-4">
            <ChargeBar soc={flow.soc} className="w-2/3" />
            <span className="text-foreground text-sm tabular-nums">
              {flow.soc === undefined ? '—' : `${Math.round(flow.soc)}%`}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-center gap-3 whitespace-nowrap">
            <span className="text-muted text-sm tabular-nums">
              {bat.watts !== undefined && bat.watts < 0 ? '−' : '+'}
              {bp.value} {bp.unit}
            </span>
            <BatteryState flow={flow} small />
          </div>
        </div>
        {/* The port half-domes sit above the van, on the outside of its outline: the van's fill and
            glow would cover a dot centred on the edge, so each is a semicircle pointing away. */}
        <svg
          viewBox={`0 ${VIEW_TOP} ${W} ${VIEW_H}`}
          className="pointer-events-none absolute inset-0 size-full"
          aria-hidden="true"
        >
          {all.map((id) => (
            <path key={id} d={dome(SPOTS[id]!)} fill="var(--accent)" />
          ))}
        </svg>
      </div>
    </div>
  )
}
