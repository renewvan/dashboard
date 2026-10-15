// The Power page's Flow layout: round nodes on a diagram, with beads travelling each wire from
// source to load (count follows the watts, speed is the shared `flowSeconds`). The SVG fills its
// panel (meet-fit), so it grows and shrinks as the bottom navbar slides, which the panel already
// accounts for by padding itself.

import type { ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  Battery as BatteryIcon,
  CircuitBoard,
  Engine,
  Plug2,
  PlugZap,
  Sun,
  Zap,
} from 'lucide-react'
import {
  flowSeconds,
  formatPower,
  IDLE_W,
  pulseSeconds,
  type FlowEdge,
  type FlowNode,
  type NodeId,
  type PowerSnapshot,
} from './flowModel'

// Large on purpose: the diagram is read from an arm's length in a van.
const R = 230
const CIRC = 2 * Math.PI * R

interface Pos {
  x: number
  y: number
}

type Layout = Partial<Record<NodeId, Pos>>

const SOURCE_IDS = ['solar', 'alternator', 'shore'] as const

// Everything below is derived from R, so resizing the orbs cannot leave the layout behind.
/** Space between the edges of two side-by-side orbs: room for a wire and its beads. */
const COL_GAP = R * 0.55
/**
 * Space between the edges of two stacked orbs. Only the wire between them lives here: labels sit on
 * the side of an orb that no wire uses (see LABEL_ABOVE), so none hangs in this gap.
 */
const ROW_GAP = R * 0.4
/** A label sits this far outside an orb's edge: its gap plus a line of text. */
const LABEL = 56
const MARGIN = 24
const COL_PITCH = 2 * R + COL_GAP
const ROW_PITCH = 2 * R + ROW_GAP
/** The top row's labels sit above it, so the top margin carries one LABEL; the bottom row's hang below. */
const TOP = MARGIN + LABEL
const W = 2 * COL_PITCH + 2 * R + 2 * MARGIN
const H = TOP + ROW_PITCH + 2 * R + LABEL + MARGIN

/**
 * Nodes whose label goes above the orb. The inverter's wire leaves from its bottom edge and the
 * battery's enters at its top, so a label hanging under the inverter would sit on that wire;
 * everything else has a free bottom edge. A static lookup: only one node is ever affected.
 */
const LABEL_ABOVE: Partial<Record<NodeId, true>> = { inverter: true }

/**
 * Three columns, left to right: sources | the middle | loads.
 *
 * With an inverter the middle column stacks Inverter over Battery, and the loads line up with
 * their own source: AC loads on the inverter's row, DC loads on the battery's row.
 *
 *   Shore  ────────►  Inverter ──► AC loads
 *   Solar ─┐             │
 *   Alternator ─────►  Battery ──► DC loads
 *
 * Without one the middle is just the battery, centred, with the single Loads orb beside it.
 * Sources are spread down the left column, so a lone source sits level with the battery instead of
 * in a corner.
 */
function layout(flow: PowerSnapshot): Layout {
  const n = flow.nodes
  const hasInverter = n.inverter.present
  const rowTop = TOP + R
  const rowBottom = rowTop + ROW_PITCH
  const midY = (rowTop + rowBottom) / 2

  const leftX = MARGIN + R
  const midX = leftX + COL_PITCH
  const rightX = midX + COL_PITCH

  // With an inverter, shore feeds the inverter (top row) while solar and alternator feed the
  // battery (bottom row), so shore goes first: ordering the column by the row each source feeds is
  // what keeps the wires from crossing. Without one, every source feeds the battery.
  const present = SOURCE_IDS.filter((id) => n[id].present).sort(
    (a, b) => Number(hasInverter && b === 'shore') - Number(hasInverter && a === 'shore'),
  )
  const pos: Layout = {}

  // Sources stack down the left column, evenly between the two rows (one source sits at the middle).
  present.forEach((id, i) => {
    const y =
      present.length === 1 ? midY : rowTop + (i * (rowBottom - rowTop)) / (present.length - 1)
    pos[id] = { x: leftX, y }
  })

  if (hasInverter) {
    pos.inverter = { x: midX, y: rowTop }
    pos.battery = { x: midX, y: rowBottom }
    pos.acLoads = { x: rightX, y: rowTop }
    pos.dcLoads = { x: rightX, y: rowBottom }
  } else {
    pos.battery = { x: midX, y: midY }
    pos.loads = { x: rightX, y: midY }
  }
  return pos
}

const ICONS: Record<NodeId, ReactNode> = {
  solar: <Sun className="size-16" />,
  alternator: <Engine className="size-16" />,
  shore: <PlugZap className="size-16" />,
  inverter: <Zap className="size-16" />,
  battery: <BatteryIcon className="size-16" />,
  loads: <Plug2 className="size-16" />,
  acLoads: <Plug2 className="size-16" />,
  dcLoads: <CircuitBoard className="size-16" />,
}

/**
 * A wire from the edge of `a`'s orb to the edge of `b`'s. The layout is columns, so the columns
 * decide the direction: orbs in different columns connect side to side (leaving the faces that look
 * at each other, never through a label), and orbs in the same column (inverter over battery)
 * connect top to bottom. The control points pull straight out of each orb, so the curve bows
 * smoothly instead of kinking.
 */
function curve(a: Pos, b: Pos): string {
  if (a.x !== b.x) {
    const s = Math.sign(b.x - a.x)
    const x1 = a.x + s * R
    const x2 = b.x - s * R
    const mx = (x1 + x2) / 2
    return `M ${x1} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${x2} ${b.y}`
  }
  const s = Math.sign(b.y - a.y)
  const y1 = a.y + s * R
  const y2 = b.y - s * R
  const my = (y1 + y2) / 2
  return `M ${a.x} ${y1} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${y2}`
}

/** One colour for every node and flow; only a low battery leaves it for `--danger`. */
const ACCENT = 'var(--accent)'

/** A bead riding the wire. offsetPath makes the browser move it, so no per-frame React work. */
function Bead({
  d,
  duration,
  delay,
  colour,
}: {
  d: string
  duration: number
  delay: number
  colour: string
}) {
  return (
    <motion.circle
      r={7}
      fill={colour}
      style={{ offsetPath: `path("${d}")`, filter: `drop-shadow(0 0 6px ${colour})` }}
      initial={{ offsetDistance: '0%', opacity: 0 }}
      animate={{ offsetDistance: '100%', opacity: [0, 1, 1, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: 'linear' }}
    />
  )
}

function Wire({ edge, peakW, pos }: { edge: FlowEdge; peakW: number; pos: Layout }) {
  const reduce = useReducedMotion()
  const a = pos[edge.from]
  const b = pos[edge.to]
  if (!a || !b) return null
  const d = curve(a, b)
  const on = edge.watts > IDLE_W
  const share = Math.min(1, edge.watts / peakW)
  const colour = ACCENT
  // 1 bead at a trickle, up to 4 at peak; lap time is the shared slow flowSeconds.
  const beads = on ? 1 + Math.round(share * 3) : 0
  const lap = flowSeconds(edge.watts, peakW)
  return (
    <g>
      {/* The wire draws itself in on first paint, like the renewvan.com diagram. */}
      <motion.path
        d={d}
        fill="none"
        stroke={on ? colour : 'var(--border)'}
        strokeOpacity={on ? 0.6 : 1}
        strokeWidth={on ? 2 + share * 3 : 2}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />
      {!reduce
        ? Array.from({ length: beads }, (_, i) => (
            <Bead key={i} d={d} duration={lap} delay={(i * lap) / beads} colour={colour} />
          ))
        : null}
    </g>
  )
}

/**
 * The battery's fill, as in the Tiles layout: a translucent disc rising from the bottom by the charge,
 * clipped to the circle, and while charging a bright band rising through it from bottom to top.
 * The translucency is in the colour (not `opacity`) so the band keeps full strength.
 */
function BatteryFill({
  x,
  y,
  soc,
  colour,
  charging,
  pulse,
}: {
  x: number
  y: number
  soc: number
  colour: string
  charging: boolean
  pulse: number
}) {
  const inner = R - 4
  const level = soc * inner * 2
  // A fixed share of the orb, not of the fill, so the glow looks the same at 20% and at 99%.
  const bandH = inner * 0.35
  return (
    <g clipPath="url(#orb-clip-battery)">
      <motion.rect
        x={x - inner}
        width={inner * 2}
        fill={`color-mix(in oklch, ${colour} 35%, transparent)`}
        initial={{ y: y + inner, height: 0 }}
        animate={{ y: y + inner - level, height: level }}
        transition={{ type: 'spring', stiffness: 60, damping: 18 }}
      />
      {charging ? (
        // Only the part of the band inside the fill shows: the fill's own rect is the clip.
        <g clipPath="url(#orb-clip-battery-fill)">
          <motion.rect
            x={x - inner}
            width={inner * 2}
            height={bandH}
            fill={`url(#orb-glow-battery)`}
            style={{ filter: 'blur(8px)' }}
            // Starts one band below the circle's bottom, ends one band above its top.
            initial={{ y: y + inner }}
            animate={{ y: y - inner - bandH }}
            transition={{ duration: pulse, repeat: Infinity, ease: 'linear' }}
          />
        </g>
      ) : null}
    </g>
  )
}

function Orb({ node, flow, pos }: { node: FlowNode; flow: PowerSnapshot; pos: Pos }) {
  const reduce = useReducedMotion()
  const { x, y } = pos
  const isBattery = node.id === 'battery'
  const w = node.watts
  const p = formatPower(isBattery && w !== undefined ? Math.abs(w) : w)
  const fill = isBattery ? (flow.soc ?? 0) / 100 : Math.min(1, Math.abs(w ?? 0) / flow.peakW)
  const low = isBattery && flow.soc !== undefined && flow.soc <= 20
  const colour = low ? 'var(--danger)' : ACCENT
  const charging = isBattery && flow.batteryState === 'charging' && !reduce
  const pulse = pulseSeconds(isBattery ? (w ?? 0) : 0, flow.peakW)
  const inner = R - 4
  return (
    <g>
      {isBattery ? (
        <defs>
          <clipPath id="orb-clip-battery">
            <circle cx={x} cy={y} r={inner} />
          </clipPath>
          {/* The band is only visible inside the fill: a second clip, the fill's own rectangle. */}
          <clipPath id="orb-clip-battery-fill">
            <rect
              x={x - inner}
              y={y + inner - fill * inner * 2}
              width={inner * 2}
              height={fill * inner * 2}
            />
          </clipPath>
          <linearGradient id="orb-glow-battery" x1="0" x2="0" y1="1" y2="0">
            <stop offset="0" stopColor={colour} stopOpacity="0" />
            <stop offset="0.55" stopColor={`color-mix(in oklch, ${colour} 100%, white 60%)`} />
            <stop offset="1" stopColor={colour} stopOpacity="0" />
          </linearGradient>
        </defs>
      ) : null}
      {/* A hollow ring: a dim full track, and the bright arc over it is the share. */}
      <circle
        cx={x}
        cy={y}
        r={R}
        fill="var(--surface)"
        stroke={colour}
        strokeOpacity={0.25}
        strokeWidth={8}
      />
      {isBattery ? (
        <BatteryFill x={x} y={y} soc={fill} colour={colour} charging={charging} pulse={pulse} />
      ) : null}
      <motion.circle
        cx={x}
        cy={y}
        r={R}
        fill="none"
        stroke={colour}
        strokeWidth={8}
        strokeLinecap="round"
        strokeDasharray={CIRC}
        transform={`rotate(-90 ${x} ${y})`}
        initial={{ strokeDashoffset: CIRC }}
        animate={{ strokeDashoffset: CIRC * (1 - fill) }}
        transition={{ type: 'spring', stiffness: 50, damping: 16 }}
        style={{ filter: `drop-shadow(0 0 6px ${colour})` }}
      />
      <foreignObject x={x - R} y={y - R} width={R * 2} height={R * 2}>
        <div className="text-foreground flex size-full flex-col items-center justify-center">
          <span style={{ color: colour }}>{ICONS[node.id]}</span>
          <span className="text-7xl font-semibold tabular-nums">
            {isBattery && flow.soc !== undefined ? `${Math.round(flow.soc)}%` : p.value}
          </span>
          <span className={`${isBattery ? 'text-foreground' : 'text-muted'} text-3xl tabular-nums`}>
            {isBattery ? `${p.value} ${p.unit}` : p.unit}
          </span>
        </div>
      </foreignObject>
      <text
        x={x}
        y={LABEL_ABOVE[node.id] ? y - R - 20 : y + R + 52}
        textAnchor="middle"
        className="fill-[var(--muted)] text-[44px]"
      >
        {node.sub && node.id === 'inverter' ? `${node.label}: ${node.sub}` : node.label}
      </text>
    </g>
  )
}

export function PowerFlow({ flow }: { flow: PowerSnapshot }) {
  const pos = layout(flow)
  return (
    <div
      className="flex min-h-0 w-full flex-1 items-center justify-center"
      data-testid="power-flow"
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full max-w-6xl"
      >
        {flow.edges
          .filter((e) => flow.nodes[e.from].present && flow.nodes[e.to].present)
          .map((e) => (
            <Wire key={`${e.from}-${e.to}`} edge={e} peakW={flow.peakW} pos={pos} />
          ))}
        {(Object.values(flow.nodes) as FlowNode[])
          .filter((n) => n.present && pos[n.id])
          .map((n) => (
            <Orb key={n.id} node={n} flow={flow} pos={pos[n.id]!} />
          ))}
      </svg>
    </div>
  )
}
