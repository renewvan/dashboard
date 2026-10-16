import { describe, expect, it } from 'vite-plus/test'
import { bandRanges } from './arcs'

describe('bandRanges', () => {
  const SPAN = 100
  const GAP = 5

  it.each(['left', 'right'] as const)(
    'leaves the gap clear between two stacked bands on the %s, never overlapping them',
    (side) => {
      const [first, second] = bandRanges(side, 2, SPAN, GAP)
      // Whichever way the angles run, the first band ends GAP degrees before the second starts.
      expect(Math.abs(second![0] - first![1])).toBeCloseTo(GAP)
      // The second begins on the far side of where the first ends, in the direction of travel.
      const direction = Math.sign(first![1] - first![0])
      expect((second![0] - first![1]) * direction).toBeGreaterThan(0)
    },
  )

  it.each(['left', 'right'] as const)(
    'keeps the outer ends of the stack where the slice ends on the %s, whatever the count',
    (side) => {
      const edge = side === 'left' ? [320, 220] : [40, 140]
      for (const count of [1, 2, 3]) {
        const ranges = bandRanges(side, count, SPAN, GAP)
        expect(ranges[0]![0]).toBe(edge[0])
        expect(ranges[count - 1]![1]).toBe(edge[1])
      }
    },
  )

  it('mirrors the right side on the left', () => {
    const left = bandRanges('left', 3, SPAN, GAP)
    const right = bandRanges('right', 3, SPAN, GAP)
    // Mirroring about the vertical axis maps angle a to 360 - a.
    left.forEach(([a, b], i) => {
      expect(360 - a).toBeCloseTo(right[i]![0])
      expect(360 - b).toBeCloseTo(right[i]![1])
    })
  })
})
