// Shared by the two van layouts (Van tiles, Van orbs): the van as the Power page's hub, with wires
// from each source plugging into a port on its body and one leaving through the nose to the loads.
// Everything here is drawn in the layout's own canvas units, so a layout owns its geometry and
// this file owns what the layouts have in common: the wire, the port marker and the van block.

import { motion, useReducedMotion } from 'motion/react'
import { flowSeconds, formatPower, IDLE_W, type PowerSnapshot } from './flowModel'
import { BatteryState } from './BatteryState'
import { ChargeBar } from './ChargeBar'
import { VanArt } from './VanArt'

import type { Point, PortSide } from './vanGeometry'

/** A grey rail, and while power flows (above the idle floor) dashes crawling along it. */
export function Wire({ d, watts, peakW }: { d: string; watts: number; peakW: number }) {
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

const DOME_R = 9

/** A semicircle on the van's outline at a port, bulging away from the van. */
function domePath({ x, y }: Point, side: PortSide): string {
  if (side === 'l') return `M${x} ${y - DOME_R} A${DOME_R} ${DOME_R} 0 0 0 ${x} ${y + DOME_R} Z`
  if (side === 'r') return `M${x} ${y - DOME_R} A${DOME_R} ${DOME_R} 0 0 1 ${x} ${y + DOME_R} Z`
  return `M${x - DOME_R} ${y} A${DOME_R} ${DOME_R} 0 0 1 ${x + DOME_R} ${y} Z`
}

/**
 * The port markers, in an SVG that sits above the van. The van's fill and glow would hide a marker
 * drawn beneath it, and a port sits on the outline, so each is a semicircle on the outside.
 */
export function PortDomes({
  ports,
  viewBox,
}: {
  ports: { port: Point; side: PortSide }[]
  viewBox: string
}) {
  return (
    <svg
      viewBox={viewBox}
      className="pointer-events-none absolute inset-0 size-full"
      aria-hidden="true"
    >
      {ports.map(({ port, side }) => (
        <path key={`${side}-${port.x}-${port.y}`} d={domePath(port, side)} fill="var(--accent)" />
      ))}
    </svg>
  )
}

/**
 * The van with its charge under it: the bar and percentage on one row, then the battery's signed
 * power and what it is doing. `left`, `top` and `width` place it in the layout's canvas, as a share
 * of it. `compact` is one text size down, for the layout with the least room under the van.
 */
export function VanHub({
  flow,
  left,
  top,
  width,
  compact = false,
}: {
  flow: PowerSnapshot
  left: string
  top: string
  width: string
  compact?: boolean
}) {
  const watts = flow.nodes.battery.watts
  const power = formatPower(watts === undefined ? undefined : Math.abs(watts))
  return (
    <div className="absolute" style={{ left, top, width }}>
      <VanArt flow={flow} className="w-full" />
      <div className="mt-3 flex items-center justify-center gap-4">
        <ChargeBar soc={flow.soc} className="w-full" />
        <span className={`text-foreground tabular-nums ${compact ? 'text-sm' : 'text-xl'}`}>
          {flow.soc === undefined ? '—' : `${Math.round(flow.soc)}%`}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-center gap-3 whitespace-nowrap">
        <span className={`text-muted tabular-nums ${compact ? 'text-sm' : ''}`}>
          {watts !== undefined && watts < 0 ? '−' : '+'}
          {power.value} {power.unit}
        </span>
        <BatteryState flow={flow} small={compact} />
      </div>
    </div>
  )
}
