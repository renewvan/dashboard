// The Power page's Orbs layout: round nodes on a diagram, joined by the same links as the Tiles
// layout (see PowerLinks: grey rails, blue dashes, one shared run into each sink). The SVG fills
// its panel (meet-fit), so it grows and shrinks as the bottom navbar slides, which the panel
// already accounts for by padding itself.

import { BmsAlertBadge } from './BmsAlertBadge'
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
  formatPower,
  sourceOpener,
  PULSE_PAUSE_S,
  pulseSeconds,
  type FlowNode,
  type NodeId,
  type PowerSnapshot,
} from './flowModel'
import { PowerLinks, type LinkBox } from './PowerLinks'
import { RollingNumber, Value } from './PowerValue'
import { SourceTarget } from './SourceTarget'

/** Number and unit sizes of an orb's reading: the Tiles' ratio, in the diagram's own units. */
const ORB_VALUE = ['text-8xl', 'text-5xl'] as const

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
/** The diagram is always two rows tall: more sources add a column, never a row, so orbs stay big. */
const H = TOP + ROW_PITCH + 2 * R + LABEL + MARGIN

/**
 * With three sources and no inverter, solar takes the middle column's top row, straight over the
 * battery (the spot an inverter would occupy), and a vertical link drops into it.
 */
function solarOnTop(flow: PowerSnapshot): boolean {
  const n = flow.nodes
  return !n.inverter.present && SOURCE_IDS.every((id) => n[id].present)
}

/** Source columns: three sources with an inverter need a second; solar-on-top needs none. */
function sourceColumns(flow: PowerSnapshot): number {
  if (solarOnTop(flow)) return 1
  return SOURCE_IDS.filter((id) => flow.nodes[id].present).length > 2 ? 2 : 1
}

/** Room outside the outermost orbs for a side label: "Alternator" is 184 wide at 44px, plus its gap. */
const SIDE = 230

function widthFor(flow: PowerSnapshot): number {
  const cols = sourceColumns(flow) + 2
  return (cols - 1) * COL_PITCH + 2 * R + 2 * SIDE
}

type LabelSide = 'left' | 'right' | 'above' | 'below'

/**
 * Where a node's label goes. Sources name themselves to the left of their orb and loads to the
 * right, in the margins outside the diagram where no wire runs. The exceptions are the orbs a wire
 * leaves through its bottom or top edge: the inverter and solar-over-battery hang theirs above,
 * the battery below. A source with another source column to its left (three sources with an
 * inverter) has a wire there, so it falls back to a label above (the upper one) or below.
 */
function labelSide(id: NodeId, flow: PowerSnapshot): LabelSide {
  if (id === 'inverter') return 'above'
  if (id === 'battery') return 'below'
  if (id === 'loads' || id === 'acLoads' || id === 'dcLoads') return 'right'
  if (solarOnTop(flow)) return id === 'solar' ? 'above' : 'left'
  if (sourceColumns(flow) < 2) return 'left'
  // Two source columns: the outer orb has the margin; the inner pair label vertically.
  const present = SOURCE_IDS.filter((s) => flow.nodes[s].present)
  if (id === present[2]) return 'left'
  return id === present[0] ? 'above' : 'below'
}

/**
 * Links are drawn in viewBox units, so their stroke must grow with the viewBox to look the same on
 * screen: a box LINK_REF_W wide draws them at 1x (tuned by eye: about 2x at the old 1680 width).
 */
const LINK_REF_W = 850

/**
 * Columns, left to right: [outer sources] | sources | the middle | loads. Always two rows.
 *
 * With an inverter the middle column stacks Inverter over Battery, and the loads line up with
 * their own source: AC loads on the inverter's row, DC loads on the battery's row.
 *
 *   Shore  ────────►  Inverter ──► AC loads
 *   Solar ─┐             │
 *   Alternator ─────►  Battery ──► DC loads
 *
 * Without one the middle is just the battery, centred, with the single Loads orb beside it.
 * One source sits level with the battery; two fill the two rows of the source column. With all
 * three, solar takes the middle column's top row, straight over the battery, and alternator and
 * shore stack on the left. (Three sources with an inverter put the third in its own column
 * further left, level with the battery.) Always two rows, so orbs stay big.
 */
function layout(flow: PowerSnapshot): Layout {
  const n = flow.nodes
  const hasInverter = n.inverter.present
  const outer = sourceColumns(flow) === 2
  const rowTop = TOP + R
  const rowBottom = rowTop + ROW_PITCH
  const midY = (rowTop + rowBottom) / 2
  /** The row the battery sits on: the lower row under an inverter or solar, else level with the middle. */
  const batteryY = hasInverter || solarOnTop(flow) ? rowBottom : midY

  const outerX = SIDE + R
  const leftX = outer ? outerX + COL_PITCH : outerX
  const midX = leftX + COL_PITCH
  const rightX = midX + COL_PITCH

  // With an inverter, shore feeds the inverter (top row) while solar and alternator feed the
  // battery (bottom row), so shore goes first: ordering the column by the row each source feeds is
  // what keeps the wires from crossing. Without one, every source feeds the battery.
  const present = SOURCE_IDS.filter((id) => n[id].present).sort(
    (a, b) => Number(hasInverter && b === 'shore') - Number(hasInverter && a === 'shore'),
  )
  const pos: Layout = {}

  if (solarOnTop(flow)) {
    // Solar sits over the battery (the inverter's spot, which this van does not have); the other
    // two sources stack in the left column, shore over alternator.
    const rest = present.filter((id) => id !== 'solar').reverse()
    pos.solar = { x: midX, y: rowTop }
    rest.forEach((id, i) => {
      pos[id] = { x: leftX, y: i === 0 ? rowTop : rowBottom }
    })
  } else {
    // The first two sources fill the source column (a lone one sits level with the battery); a
    // third is the outer column's only orb, level with the battery.
    present.slice(0, 2).forEach((id, i) => {
      pos[id] = { x: leftX, y: present.length === 1 ? batteryY : i === 0 ? rowTop : rowBottom }
    })
    if (present[2]) pos[present[2]] = { x: outerX, y: batteryY }
  }

  if (hasInverter) {
    pos.inverter = { x: midX, y: rowTop }
    pos.battery = { x: midX, y: rowBottom }
    pos.acLoads = { x: rightX, y: rowTop }
    pos.dcLoads = { x: rightX, y: rowBottom }
  } else {
    pos.battery = { x: midX, y: batteryY }
    pos.loads = { x: rightX, y: batteryY }
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

/** One colour for every node and flow; only a low battery leaves it for `--danger`. */
const ACCENT = 'var(--accent)'

/**
 * The battery's fill, as in the Tiles layout: a translucent disc rising from the bottom by the charge,
 * clipped to the circle, with a soft band that rises through it from bottom to top while charging.
 * The translucency is in the colour (not `opacity`) so the band keeps its own strength.
 */
function BatteryFill({
  x,
  y,
  soc,
  colour,
  active,
  pulse,
}: {
  x: number
  y: number
  soc: number
  colour: string
  active: boolean
  pulse: number
}) {
  const inner = R - 4
  const level = soc * inner * 2
  // A fixed share of the orb, not of the fill, so the glow looks the same at 20% and at 99%.
  const bandH = inner * 0.2
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
      {active ? (
        // Only the part of the band inside the fill shows: the fill's own rect is the clip.
        <g clipPath="url(#orb-clip-battery-fill)">
          <motion.rect
            x={x - inner}
            width={inner * 2}
            height={bandH}
            fill={`url(#orb-glow-battery)`}
            opacity={0.5}
            // One loop: rise from just below the circle, through the fill, out of its top, then
            // hold there hidden for the pause, so the rest is empty. Keyframes (not `repeatDelay`)
            // because the loop restarts from the first keyframe, which is the hidden bottom.
            initial={{ y: y + inner }}
            animate={{ y: [y + inner, y - inner - bandH, y - inner - bandH] }}
            transition={{
              duration: pulse + PULSE_PAUSE_S,
              times: [0, pulse / (pulse + PULSE_PAUSE_S), 1],
              repeat: Infinity,
              ease: 'linear',
            }}
          />
        </g>
      ) : null}
    </g>
  )
}

function Orb({
  node,
  flow,
  pos,
  onPress,
}: {
  node: FlowNode
  flow: PowerSnapshot
  pos: Pos
  /** Opens the device behind the orb; absent, the orb is a readout. */
  onPress: (() => void) | undefined
}) {
  const reduce = useReducedMotion()
  const { x, y } = pos
  const isBattery = node.id === 'battery'
  const w = node.watts
  const p = formatPower(isBattery && w !== undefined ? Math.abs(w) : w)
  const fill = isBattery ? (flow.soc ?? 0) / 100 : Math.min(1, Math.abs(w ?? 0) / flow.peakW)
  const low = isBattery && flow.soc !== undefined && flow.soc <= 20
  const colour = low ? 'var(--danger)' : ACCENT
  const charging = isBattery && flow.batteryState === 'charging'
  const active = charging && !reduce
  const pulse = pulseSeconds(isBattery ? (w ?? 0) : 0, flow.peakW)
  const inner = R - 4
  const side = labelSide(node.id, flow)
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
            <stop offset="1" stopColor={`color-mix(in oklch, ${colour} 100%, white 15%)`} />
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
        <BatteryFill x={x} y={y} soc={fill} colour={colour} active={active} pulse={pulse} />
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
        style={{ filter: !isBattery || charging ? `drop-shadow(0 0 6px ${colour})` : 'none' }}
      />
      <foreignObject x={x - R} y={y - R} width={R * 2} height={R * 2}>
        <SourceTarget
          onPress={onPress}
          label={`${node.label}: ${p.value} ${p.unit}`.trim()}
          className="text-foreground flex size-full flex-col items-center justify-center rounded-full"
        >
          <span className="mb-4" style={{ color: colour }}>
            {ICONS[node.id]}
          </span>
          {isBattery ? (
            <>
              <Value
                sizeClass={ORB_VALUE}
                value={flow.soc === undefined ? '—' : Math.round(flow.soc)}
                unit={flow.soc === undefined ? '' : '%'}
              />
              <span className="text-foreground text-3xl tabular-nums">
                {p.value} {p.unit}
              </span>
              <BmsAlertBadge flow={flow} className="mt-2 max-w-full px-6 text-2xl" />
            </>
          ) : (
            <Value sizeClass={ORB_VALUE} value={<RollingNumber value={w} />} unit={p.unit} />
          )}
        </SourceTarget>
      </foreignObject>
      <text
        x={side === 'left' ? x - R - 28 : side === 'right' ? x + R + 28 : x}
        y={side === 'above' ? y - R - 20 : side === 'below' ? y + R + 52 : y + 16}
        textAnchor={side === 'left' ? 'end' : side === 'right' ? 'start' : 'middle'}
        className="fill-[var(--muted)] text-[44px]"
      >
        {node.sub && node.id === 'inverter' ? `${node.label}: ${node.sub}` : node.label}
      </text>
    </g>
  )
}

/**
 * `fit` sizes the box to the diagram's own shape instead of filling its parent, so a card holds it
 * with no empty margin above or below.
 */
export function OrbsLayout({
  flow,
  fit = false,
  onOpenInstance,
}: {
  flow: PowerSnapshot
  fit?: boolean
  /** Opens a source's device in Settings (its `instanceKey`); absent, the sources are readouts. */
  onOpenInstance?: (key: string) => void
}) {
  const pos = layout(flow)
  // An orb is a box as wide and tall as its circle: wires leave from its extreme left, right, top
  // and bottom points, at its centre.
  const boxes: Partial<Record<NodeId, LinkBox>> = {}
  for (const [id, p] of Object.entries(pos) as [NodeId, Pos][]) {
    boxes[id] = { left: p.x - R, right: p.x + R, top: p.y - R, bottom: p.y + R, cx: p.x, cy: p.y }
  }
  return (
    <div
      className={
        fit
          ? 'flex w-full items-center justify-center'
          : 'flex min-h-0 w-full flex-1 items-center justify-center'
      }
      style={fit ? { aspectRatio: widthFor(flow) / H } : undefined}
      data-testid="power-orbs"
    >
      <svg
        viewBox={`0 0 ${widthFor(flow)} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full max-w-6xl"
      >
        <PowerLinks
          edges={flow.edges}
          boxes={boxes}
          present={(id) => flow.nodes[id].present}
          peakW={flow.peakW}
          scale={widthFor(flow) / LINK_REF_W}
        />
        {(Object.values(flow.nodes) as FlowNode[])
          .filter((n) => n.present && pos[n.id])
          .map((n) => (
            <Orb
              key={n.id}
              node={n}
              flow={flow}
              pos={pos[n.id]!}
              onPress={sourceOpener(flow, n.id, onOpenInstance)}
            />
          ))}
      </svg>
    </div>
  )
}
