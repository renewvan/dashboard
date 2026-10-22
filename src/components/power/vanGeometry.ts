// The van layouts' shared geometry: points, which side of the van a port is on, and the wire path
// between an endpoint and a port. Pure data and maths, apart from VanDiagram's components.

/** Which side of the van a port is on, which is also the way its marker bulges away from it. */
export type PortSide = 'l' | 'r' | 't'

export interface Point {
  x: number
  y: number
}

/**
 * The canvas both van layouts share, so the van has the same size and place in each. `w` is the
 * canvas width in units, the visible band runs from `top` for `h` units, and `van` is the van's
 * box in it (its height follows from VanArt's 113.312:68.002 ratio). A layout may paint outside
 * the band; it only sets how the canvas is scaled to the screen. The van's `y` is 5% further down
 * the band than the Van tiles content alone would put it.
 */
export const VAN_FRAME = {
  w: 1200,
  top: -10,
  h: 570,
  van: { x: 410, y: 290.3, w: 380 },
} as const

/**
 * The wire between an endpoint and a port on the van, as an SVG path. Left and right ports are
 * joined by an S-curve that leaves and arrives horizontally; the roof port by one that leaves and
 * arrives vertically. `reverse` runs it from the van to the endpoint, so the dashes travel in the
 * direction of the power (loads draw from the van, sources feed it).
 */
export function wirePath(start: Point, port: Point, side: PortSide, reverse: boolean): string {
  const [a, b] = reverse ? [port, start] : [start, port]
  return side === 't'
    ? `M${a.x} ${a.y} C ${a.x} ${(a.y + b.y) / 2}, ${b.x} ${(a.y + b.y) / 2}, ${b.x} ${b.y}`
    : `M${a.x} ${a.y} C ${(a.x + b.x) / 2} ${a.y}, ${(a.x + b.x) / 2} ${b.y}, ${b.x} ${b.y}`
}
