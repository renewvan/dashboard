// Geometry shared by the half-moons and the centre rings: the cockpit dial's vocabulary (thin outer
// ring, value band cut at fixed angles), in angles clockwise from 12 o'clock.

/** One viewBox for the centre rings, so geometry is in these units whatever the rendered size. */
export const RINGS_SIZE = 260
export const C = RINGS_SIZE / 2
/** Gap between segments, in degrees (the "cuts"). */
export const CUT = 1.6

/**
 * The theme's `--radius` (src/global.css, 0.25rem = 4px) as a corner radius in a viewBox's units, given
 * how many viewBox units span `renderedPx` pixels at the drawing's widest render. A ring's ends are then
 * as round as a card or a button; the drawing shrinks with its container, and the corners with it.
 */
export function cornerRadius(viewBoxUnits: number, renderedPx: number) {
  return 4 / (renderedPx / viewBoxUnits)
}

/** The centre rings' corner radius: their 260-unit viewBox renders at most 420px wide. */
export const RINGS_CORNER_R = cornerRadius(RINGS_SIZE, 420)

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

/** The shortest slice, in degrees, whose two rounded corners fit side by side on its inner arc. */
export function minRoundedDeg(r: number, band: number, cornerR: number) {
  return ((2 * cornerR) / (r - band / 2)) * (180 / Math.PI)
}

function point(angleDeg: number, r: number, cx: number, cy: number) {
  const [x, y] = polar(angleDeg, r, cx, cy)
  return `${+x.toFixed(3)} ${+y.toFixed(3)}`
}

/**
 * The angle range of each of `count` stacked bands on a side dial, top first, clockwise from 12
 * o'clock: a `span`-degree slice centred on 9 o'clock (left) or 3 o'clock (right), cut into equal
 * bands with `gap` degrees left clear between neighbours. Angles fall down the left side and rise down
 * the right, so the gap is taken off each inner end in the direction of its own band.
 */
export function bandRanges(
  side: 'left' | 'right',
  count: number,
  span: number,
  gap: number,
): [number, number][] {
  const mid = side === 'left' ? 270 : 90
  const top = side === 'left' ? mid + span / 2 : mid - span / 2
  const bottom = side === 'left' ? mid - span / 2 : mid + span / 2
  const step = (bottom - top) / count
  const half = (Math.sign(step) * gap) / 2
  return Array.from({ length: count }, (_, i) => [
    top + i * step + (i > 0 ? half : 0),
    top + (i + 1) * step - (i < count - 1 ? half : 0),
  ])
}

/**
 * A band slice between two angles on radius `r`, `band` thick, as a filled shape. `roundLow` /
 * `roundHigh` round the corners at the slice's smaller / larger angle by `cornerR`; an end left square
 * keeps its cut exactly as a stroked arc has it. The angles may be given in either order.
 */
export function slice(
  angleA: number,
  angleB: number,
  r: number,
  band: number,
  cornerR: number,
  roundLow: boolean,
  roundHigh: boolean,
  cx = C,
  cy = C,
) {
  const low = Math.min(angleA, angleB)
  const high = Math.max(angleA, angleB)
  const ro = r + band / 2
  const ri = r - band / 2
  // Rounding a corner moves its arc end by cornerR along the arc, which is cornerR / radius radians.
  const along = (radius: number) => ((cornerR / radius) * 180) / Math.PI
  const large = high - low > 180 ? 1 : 0
  const oLow = low + (roundLow ? along(ro) : 0)
  const oHigh = high - (roundHigh ? along(ro) : 0)
  const iLow = low + (roundLow ? along(ri) : 0)
  const iHigh = high - (roundHigh ? along(ri) : 0)

  let d = `M ${point(oLow, ro, cx, cy)} A ${ro} ${ro} 0 ${large} 1 ${point(oHigh, ro, cx, cy)}`
  if (roundHigh) {
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${point(high, ro - cornerR, cx, cy)} L ${point(high, ri + cornerR, cx, cy)}`
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${point(iHigh, ri, cx, cy)}`
  } else {
    d += ` L ${point(iHigh, ri, cx, cy)}`
  }
  d += ` A ${ri} ${ri} 0 ${large} 0 ${point(iLow, ri, cx, cy)}`
  if (roundLow) {
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${point(low, ri + cornerR, cx, cy)} L ${point(low, ro - cornerR, cx, cy)}`
    d += ` A ${cornerR} ${cornerR} 0 0 1 ${point(oLow, ro, cx, cy)}`
  } else {
    d += ` L ${point(oLow, ro, cx, cy)}`
  }
  return `${d} Z`
}
