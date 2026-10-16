// The Tiles layout's link layer: grey rails with blue dashes crawling in the direction of power.
//
// Edges that feed the same tile (solar, alternator and shore into the battery) each get their own
// private run out of their tile, then MERGE into one shared final run into the sink. That run is
// drawn once, with the speed of the SUM of the edges feeding it (what the sink actually receives),
// so overlapping edges never paint out-of-phase dashes on top of each other. Corners are rounded
// at CORNER_R. Tiles stacked in one column (inverter over battery) get a plain vertical link.

import { motion, useReducedMotion } from 'motion/react'
import { flowSeconds, IDLE_W, type FlowEdge, type NodeId } from './flowModel'

export interface LinkBox {
  left: number
  right: number
  top: number
  bottom: number
  cx: number
  cy: number
}

/** Corner radius of an elbow, in px. */
const CORNER_R = 12

/** One dash step is 20px; a lap of the whole pattern takes flowSeconds / 6. */
const DASH_STEP = 20

interface Item {
  edge: FlowEdge
  a: LinkBox
  b: LinkBox
}

/** Rail plus, when live, dashes crawling along it at a speed from `watts`. */
function Run({
  d,
  watts,
  peakW,
  scale,
}: {
  d: string
  watts: number
  peakW: number
  scale: number
}) {
  const reduce = useReducedMotion()
  const duration = flowSeconds(watts, peakW) / 6
  const step = DASH_STEP * scale
  return (
    <>
      <path
        d={d}
        fill="none"
        stroke="var(--border)"
        strokeWidth={3 * scale}
        strokeLinecap="round"
      />
      {watts > IDLE_W ? (
        <motion.path
          d={d}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={4 * scale}
          strokeLinecap="round"
          strokeDasharray={`${2 * scale} ${step - 2 * scale}`}
          style={{ filter: `drop-shadow(0 0 ${4 * scale}px var(--accent))` }}
          animate={reduce ? undefined : { strokeDashoffset: [0, -step] }}
          transition={{ duration, repeat: Infinity, ease: 'linear' }}
        />
      ) : null}
    </>
  )
}

/** Whether two tiles share a column, so the link between them is a straight vertical. */
function stacked(a: LinkBox, b: LinkBox) {
  return a.left < b.right && b.left < a.right
}

function verticalPath(a: LinkBox, b: LinkBox): string {
  const x = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2
  return b.top >= a.bottom ? `M ${x} ${a.bottom} V ${b.top}` : `M ${x} ${a.top} V ${b.bottom}`
}

/**
 * The merge column between `a` and `b`: where an edge's private run ends and the shared run into
 * `b` begins (`lane` 0 = hugging `a`, 1 = hugging `b`).
 */
function mergePoint(a: LinkBox, b: LinkBox, lane: number) {
  const rightward = b.left >= a.right
  return {
    mx: rightward ? a.right + (b.left - a.right) * lane : a.left - (a.left - b.right) * lane,
  }
}

/** Source tile edge -> merge column `mx` -> sink centre line, both corners rounded. */
function privatePath(a: LinkBox, b: LinkBox, mx: number, scale: number): string {
  const rightward = b.left >= a.right
  const sx = rightward ? a.right : a.left
  const dir = rightward ? 1 : -1
  const dy = b.cy - a.cy
  const down = dy >= 0 ? 1 : -1
  const r = Math.min(CORNER_R * scale, Math.abs(mx - sx), Math.abs(dy) / 2)
  if (r < 0.5 || Math.abs(dy) < 1) return `M ${sx} ${a.cy} H ${mx} V ${b.cy}`
  return [
    `M ${sx} ${a.cy}`,
    `H ${mx - dir * r}`,
    `Q ${mx} ${a.cy} ${mx} ${a.cy + down * r}`,
    `V ${b.cy - down * r}`,
    `Q ${mx} ${b.cy} ${mx + dir * r} ${b.cy}`,
  ].join(' ')
}

/** The final run from the merge column into the sink, shared by every edge that feeds it. */
function trunkPath(b: LinkBox, mx: number): string {
  const ex = mx <= b.cx ? b.left : b.right
  return `M ${mx} ${b.cy} H ${ex}`
}

/** Edges sharing a gap but heading to different tiles run in separate columns. */
function laneOf(edge: FlowEdge): number {
  return edge.from === 'shore' && edge.to === 'inverter' ? 0.25 : 0.5
}

export function PowerLinks({
  edges,
  boxes,
  present,
  peakW,
  scale = 1,
}: {
  edges: FlowEdge[]
  boxes: Partial<Record<NodeId, LinkBox>>
  present: (id: NodeId) => boolean
  peakW: number
  /** Drawing units per CSS px: stroke, dashes, glow and corners are multiplied by it. */
  scale?: number
}) {
  const sinks: Record<string, Item[]> = {}
  const verticals: Item[] = []
  for (const edge of edges) {
    const a = boxes[edge.from]
    const b = boxes[edge.to]
    if (!a || !b || !present(edge.from) || !present(edge.to)) continue
    if (stacked(a, b)) verticals.push({ edge, a, b })
    else (sinks[`${edge.to}@${laneOf(edge)}`] ??= []).push({ edge, a, b })
  }

  return (
    <>
      {Object.entries(sinks).map(([key, items]) => {
        const total = items.reduce((w, { edge }) => w + edge.watts, 0)
        const lane = laneOf(items[0].edge)
        // Every edge into a sink merges in the gap beside the sink, so a source in a farther
        // column runs straight past the nearer ones instead of elbowing through them.
        const nearest = items.reduce((n, item) =>
          Math.abs(item.b.cx - item.a.cx) < Math.abs(n.b.cx - n.a.cx) ? item : n,
        )
        const mx = mergePoint(nearest.a, nearest.b, lane).mx
        return (
          <g key={key}>
            {items.map((item) => (
              <Run
                key={`${item.edge.from}-${item.edge.to}`}
                d={privatePath(item.a, item.b, mx, scale)}
                watts={item.edge.watts}
                peakW={peakW}
                scale={scale}
              />
            ))}
            <Run d={trunkPath(nearest.b, mx)} watts={total} peakW={peakW} scale={scale} />
          </g>
        )
      })}
      {verticals.map(({ a, b, edge }) => (
        <Run
          key={`${edge.from}-${edge.to}`}
          d={verticalPath(a, b)}
          watts={edge.watts}
          peakW={peakW}
          scale={scale}
        />
      ))}
    </>
  )
}
