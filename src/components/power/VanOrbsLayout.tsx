// The Power page's Van orbs layout: the van is the hub, and each source and the loads is a round
// orb (a hollow ring, an accent arc for its share of the peak, the icon, the number, and its label
// inside the ring). Wires run from each orb into a port on the van's body; the van carries the
// charge, so there is no Battery orb.

import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Engine, Plug2, PlugZap, SolarPanel, type LucideIcon } from 'lucide-react'
import { formatPower, IDLE_W, sourceOpener, type NodeId, type PowerSnapshot } from './flowModel'
import { RollingNumber, Value } from './PowerValue'
import { PortDomes, VanHub, Wire } from './VanDiagram'
import { SourceTarget } from './SourceTarget'
import { VAN_FRAME, wirePath, type Point, type PortSide } from './vanGeometry'
import { SolarHistory } from '@/components/widgets/solar/SolarHistory'
import { yieldHistoryView } from '@/components/widgets/solar/solarView'
import type { Solar } from '@/types'

const ICON: Partial<Record<NodeId, LucideIcon>> = {
  solar: SolarPanel,
  alternator: Engine,
  shore: PlugZap,
  loads: Plug2,
  acLoads: Plug2,
  dcLoads: Plug2,
}
/** The icon's size class, and raised for the phone card with the text (see `ORB_VALUE_COMPACT`). */
const ICON_SIZE = 'size-10'
const ICON_SIZE_COMPACT = 'size-16'

/**
 * Orb radius in canvas units. Each side column can hold two orbs, so they are sized to stack in the
 * band beside the van, with room for a wire between them and the van.
 */
const R = 115
const CIRC = 2 * Math.PI * R
const ORB_VALUE = ['text-4xl', 'text-2xl'] as const
/**
 * The same, raised for a phone card, where the canvas is drawn at about a third of its size. The
 * largest that stay inside the ring (230 units across, about 198 of them usable): "1.85 kW" at this
 * size is 171 units wide, and the widest label, "Alternator" at `text-4xl`, 151.
 */
const ORB_VALUE_COMPACT = ['text-6xl', 'text-3xl'] as const

/** Height of the label drawn outside an orb. */
const LABEL_H = 44
/** Space between that label and the ring. */
const LABEL_GAP = 24

const W = VAN_FRAME.w
/** Empty space between the roof and the Solar orb above it. */
const SOLAR_GAP = 60
/** Empty space between the screen edge and an outer orb, and between two stacked orbs. */
const EDGE_GAP = 40
const STACK_GAP = 50

// The van is where Van tiles draws it, in the same canvas (VAN_FRAME), so it has the same size and
// place in both layouts. The orbs are laid out around it and may paint outside the visible band.
//
//   Solar                    over the van
//   Alternator               Loads, or AC and DC loads, on the right; each wire runs to its own
//   Shore       [ VAN ]      port on the van's body
const VAN_X = VAN_FRAME.van.x
const VAN_Y = VAN_FRAME.van.y
const VAN_W_UNITS = VAN_FRAME.van.w
const k = VAN_W_UNITS / 113.312

// Each side column has up to two slots, stacked about the diagram's vertical centre: halfway between
// the top of the Solar orb and the bottom of the van's text stack, so a pair reads as centred on the
// whole figure. A column with one orb puts it on the van's side-port row instead, level with its
// port. Alternator and Shore fill the left column; Loads, or AC and DC loads, the right.
const ORB_LEFT_X = EDGE_GAP + R
const ORB_RIGHT_X = W - EDGE_GAP - R
const SIDE_Y = VAN_Y + 30 * k
const SOLAR_Y = VAN_Y - (R + SOLAR_GAP)
/** The bar, the watts line and the state line under the van. */
const VAN_STACK_H = 100
const VAN_H_UNITS = (VAN_W_UNITS * 68.002) / 113.312
const COLUMN_Y = (SOLAR_Y - R + VAN_Y + VAN_H_UNITS + VAN_STACK_H) / 2
/** Slot centres above and below the column's centre. */
const SLOT_UP_Y = COLUMN_Y - (R + STACK_GAP / 2)
const SLOT_DOWN_Y = COLUMN_Y + (R + STACK_GAP / 2)
const at = (px: number, py: number): Point => ({ x: VAN_X + px * k, y: VAN_Y + py * k })

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
  alternator: { c: { x: ORB_LEFT_X, y: SLOT_UP_Y }, port: at(3.7, 26), side: 'l' },
  shore: { c: { x: ORB_LEFT_X, y: SLOT_DOWN_Y }, port: at(1.25, 55.3), side: 'l' },
  loads: { c: { x: ORB_RIGHT_X, y: SIDE_Y }, port: at(108.68, 34), side: 'r' },
  acLoads: { c: { x: ORB_RIGHT_X, y: SLOT_UP_Y }, port: at(108.68, 30), side: 'r' },
  dcLoads: { c: { x: ORB_RIGHT_X, y: SLOT_DOWN_Y }, port: at(108.68, 46), side: 'r' },
}

// The visible band is the tiles layout's, so the canvas scales to the screen the same way and the
// van comes out the same size. The orbs reach past it.
const VIEW_TOP = VAN_FRAME.top
const VIEW_H = VAN_FRAME.h
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
  history,
  compact,
  onPress,
}: {
  id: NodeId
  spot: Spot
  label: string
  /** What the wire carries: drives the arc and the glow. */
  watts: number
  /** What the orb reads out (undefined = not published). */
  shown: number | undefined
  peakW: number
  /** Drawn in the label's place, at the foot of the orb (the Solar orb's days of harvest). */
  history?: ReactNode
  /** Phone card: the text is raised, as the canvas is drawn at about a third of its size. */
  compact: boolean
  /** Opens the device behind the orb; absent, the orb is a readout. */
  onPress: (() => void) | undefined
}) {
  const { x, y } = spot.c
  const p = formatPower(shown)
  const share = Math.min(1, Math.abs(watts) / peakW)
  const active = watts > IDLE_W
  const colour = 'var(--accent)'
  const Icon = ICON[id]
  // The Solar orb with its history carries its label to the left of the ring: above it the label
  // would crowd the clock.
  const beside = history !== undefined
  const below = spot.c.y === SLOT_DOWN_Y
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
        <SourceTarget
          onPress={onPress}
          label={`${label}: ${p.value} ${p.unit}`.trim()}
          className="text-foreground flex size-full flex-col items-center justify-center rounded-full"
        >
          {Icon && (
            <Icon
              className={`${compact ? `${ICON_SIZE_COMPACT} mb-2` : `${ICON_SIZE} mb-3`}`}
              style={{ color: colour }}
            />
          )}
          <Value
            sizeClass={compact ? ORB_VALUE_COMPACT : ORB_VALUE}
            value={<RollingNumber value={shown} />}
            unit={p.unit}
          />
          {history && <div className="mt-3 h-9 w-36">{history}</div>}
        </SourceTarget>
      </foreignObject>
      {/* The label sits outside the ring, above it, or below it for the lower orb of a stacked
          pair, to leave the ring to the icon and number. */}
      <foreignObject
        x={beside ? x - R - LABEL_GAP - R * 2 : x - R}
        y={beside ? y - LABEL_H / 2 : below ? y + R + LABEL_GAP : y - R - LABEL_H - LABEL_GAP}
        width={R * 2}
        height={LABEL_H}
      >
        <div
          className={`text-muted flex size-full leading-none ${compact ? 'text-4xl' : 'text-2xl'} ${beside ? 'items-center justify-end' : `justify-center ${below ? 'items-start' : 'items-end'}`}`}
        >
          {label}
        </div>
      </foreignObject>
    </g>
  )
}

/** The orbs on the right: what the van feeds. One derived Loads, or AC and DC loads with an inverter. */
const LOAD_IDS = ['loads', 'acLoads', 'dcLoads'] as const
const isLoad = (id: NodeId) => (LOAD_IDS as readonly NodeId[]).includes(id)

export function VanOrbsLayout({
  flow,
  solar,
  compact = false,
  onOpenInstance,
}: {
  flow: PowerSnapshot
  /** Absent until a solar controller has published its required fields: then no history is drawn. */
  solar?: Solar
  /** Phone card: raises the orbs' text, as the canvas is drawn at about a third of its size. */
  compact?: boolean
  /** Opens a source's device in Settings (its `instanceKey`); absent, the sources are readouts. */
  onOpenInstance?: (key: string) => void
}) {
  const solarHistory = yieldHistoryView(solar?.yield_history_wh)
  const sources = (['solar', 'alternator', 'shore'] as const).filter((id) => flow.nodes[id].present)
  const loads = LOAD_IDS.filter((id) => flow.nodes[id].present)
  const all: NodeId[] = [...sources, ...loads]
  // What the wire carries: a load's is the flow into it, a source's is its own reading.
  const wattsOf = (id: NodeId) =>
    isLoad(id) ? (flow.edges.find((e) => e.to === id)?.watts ?? 0) : (flow.nodes[id].watts ?? 0)
  // A column with a single orb puts it on the side-port row; two stack about the column's centre.
  const leftCount = sources.filter((id) => id !== 'solar').length
  const spotOf = (id: NodeId): Spot => {
    const s = SPOTS[id]!
    return leftCount === 1 && (id === 'alternator' || id === 'shore')
      ? { ...s, c: { ...s.c, y: SIDE_Y } }
      : s
  }
  return (
    <div
      data-testid="power-van-orbs"
      className="flex min-h-0 flex-1 items-center justify-center pb-16"
    >
      <div className="relative h-full max-w-full" style={{ aspectRatio: `${W} / ${VIEW_H}` }}>
        <svg viewBox={VIEW_BOX} className="absolute inset-0 size-full overflow-visible">
          <g aria-hidden="true">
            {all.map((id) => {
              const s = spotOf(id)
              return (
                <Wire
                  key={id}
                  d={wirePath(edge(s), s.port, s.side, isLoad(id))}
                  watts={wattsOf(id)}
                  peakW={flow.peakW}
                />
              )
            })}
          </g>
          {all.map((id) => (
            <Orb
              key={id}
              id={id}
              spot={spotOf(id)}
              label={flow.nodes[id].label}
              watts={wattsOf(id)}
              shown={flow.nodes[id].watts}
              peakW={flow.peakW}
              history={
                id === 'solar' && solarHistory ? <SolarHistory view={solarHistory} /> : undefined
              }
              compact={compact}
              onPress={sourceOpener(flow, id, onOpenInstance)}
            />
          ))}
        </svg>
        <VanHub
          flow={flow}
          onPress={sourceOpener(flow, 'battery', onOpenInstance)}
          left={`${(VAN_X / W) * 100}%`}
          top={`${((VAN_Y - VIEW_TOP) / VIEW_H) * 100}%`}
          width={`${(VAN_W_UNITS / W) * 100}%`}
          compact={compact}
        />
        <PortDomes ports={all.map(spotOf)} viewBox={VIEW_BOX} />
      </div>
    </div>
  )
}
