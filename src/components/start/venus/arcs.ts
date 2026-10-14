// Geometry shared by the half-moons and the centre rings: the cockpit dial's vocabulary (thin outer
// ring, value band cut at fixed angles), in angles clockwise from 12 o'clock.

/** One viewBox for the centre rings, so geometry is in these units whatever the rendered size. */
export const RINGS_SIZE = 260
export const C = RINGS_SIZE / 2
/** Gap between segments, in degrees (the "cuts"). */
export const CUT = 1.6

function polar(angleDeg: number, r: number, cx: number, cy: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as const
}

/** An SVG arc path of radius `r` around (`cx`, `cy`); either angle may be the smaller one. */
export function arc(from: number, to: number, r: number, cx = C, cy = C) {
  const [x1, y1] = polar(from, r, cx, cy)
  const [x2, y2] = polar(to, r, cx, cy)
  return `M ${x1} ${y1} A ${r} ${r} 0 ${Math.abs(to - from) > 180 ? 1 : 0} ${to > from ? 1 : 0} ${x2} ${y2}`
}
