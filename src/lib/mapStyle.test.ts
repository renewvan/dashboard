import { describe, expect, it } from 'vite-plus/test'
import { basemapStyle } from './mapStyle'

type Layer = { id: string; type: string; paint?: Record<string, unknown> }

/**
 * The colour a style paints a layer with. A plain colour is returned as is; a zoom-dependent one (an
 * `interpolate` expression, as the minor roads use) gives its first stop, the colour at the lowest
 * zoom it is defined for, which is enough to compare layers against each other.
 */
function paint(theme: 'light' | 'dark', id: string, property: string): string {
  const layers = basemapStyle('http://hub', theme).layers as Layer[]
  const value = layers.find((l) => l.id === id)?.paint?.[property]
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value[0] === 'interpolate') {
    const stop = value.find((v, i) => i >= 3 && typeof v === 'string' && v.startsWith('#'))
    if (typeof stop === 'string') return stop
  }
  throw new Error(`${theme}: no usable ${property} on layer ${id}`)
}

/** WCAG relative luminance of a `#rrggbb` colour. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('basemapStyle', () => {
  it('loads every resource from the page origin, so nothing leaves the LAN', () => {
    for (const theme of ['light', 'dark'] as const) {
      const style = basemapStyle('http://hub:8080', theme)
      expect(style.glyphs).toBe('http://hub:8080/maps/fonts/{fontstack}/{range}.pbf')
      expect(style.sprite).toBe(`http://hub:8080/maps/sprites/v4/${theme}`)
      // Every source is fetched too, so each one must be the local archive.
      const urls = Object.values(style.sources).map((s) => ('url' in s ? s.url : undefined))
      expect(urls).toEqual(['pmtiles://http://hub:8080/maps/basemap.pmtiles'])
    }
  })

  it('takes its sprite and colours from the theme: a light map is not a dark map with a new path', () => {
    const light = basemapStyle('http://hub', 'light')
    const dark = basemapStyle('http://hub', 'dark')
    expect(light.sprite).toBe('http://hub/maps/sprites/v4/light')
    expect(JSON.stringify(light.layers)).not.toBe(JSON.stringify(dark.layers))
    expect(paint('light', 'background', 'background-color')).not.toBe(
      paint('dark', 'background', 'background-color'),
    )
  })

  describe('the dark map stays legible on a small screen', () => {
    // Stock Protomaps `dark` has streets at 1.5:1 against the land and labels at 2.1:1, which is
    // why the map read as a dark smudge. These floors fail if the lift is flattened back.
    const land = () => paint('dark', 'earth', 'fill-color')

    it('draws roads clearly lighter than the land, and highways lighter than minor roads', () => {
      const minor = paint('dark', 'roads_minor', 'line-color')
      const highway = paint('dark', 'roads_highway', 'line-color')
      expect(contrast(minor, land())).toBeGreaterThanOrEqual(1.8)
      expect(contrast(highway, land())).toBeGreaterThanOrEqual(3)
      expect(luminance(highway)).toBeGreaterThan(luminance(minor))
    })

    it('draws buildings between the land and the roads, so they read as shapes', () => {
      const buildings = paint('dark', 'buildings', 'fill-color')
      const roads = paint('dark', 'roads_minor', 'line-color')
      expect(luminance(buildings)).toBeGreaterThan(luminance(land()))
      expect(luminance(buildings)).toBeLessThan(luminance(roads))
    })

    it('keeps the map dark: land stays a low-luminance colour, not a grey one', () => {
      expect(luminance(land())).toBeLessThan(0.06)
    })

    it('draws street names with text-grade contrast (WCAG AA, 4.5:1)', () => {
      const label = paint('dark', 'roads_labels_minor', 'text-color')
      expect(contrast(label, land())).toBeGreaterThanOrEqual(4.5)
    })
  })

  describe('the light map has colour and separation, not one pale grey', () => {
    // Stock Protomaps `light` is land #e2dfda, buildings #cccccc and roads #ebebeb: one pale grey,
    // so it read as an X-ray with only the water in colour.
    const land = () => paint('light', 'earth', 'fill-color')

    it('draws buildings visibly darker than the land they stand on', () => {
      const buildings = paint('light', 'buildings', 'fill-color')
      expect(contrast(buildings, land())).toBeGreaterThanOrEqual(1.1)
      expect(luminance(buildings)).toBeLessThan(luminance(land()))
    })

    it('draws roads lighter than the land, so they outline against it', () => {
      expect(luminance(paint('light', 'roads_minor', 'line-color'))).toBeGreaterThan(
        luminance(land()),
      )
    })

    it('gives parks and water their own hue, so they are not just more grey', () => {
      const hue = (hex: string) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
        return Math.max(r, g, b) - Math.min(r, g, b)
      }
      expect(hue(paint('light', 'water', 'fill-color'))).toBeGreaterThanOrEqual(30)
      // `landuse_urban_green` paints with `park_b` directly. Reading it also proves the override
      // reaches the style: an unused flavor key (as `park_a` was) would leave the stock colour.
      const green = paint('light', 'landuse_urban_green', 'fill-color')
      expect(green).not.toBe(paint('light', 'earth', 'fill-color'))
      expect(hue(green)).toBeGreaterThanOrEqual(15)
    })

    it('draws street names dark enough to read on the land (WCAG AA, 4.5:1)', () => {
      expect(
        contrast(paint('light', 'roads_labels_minor', 'text-color'), land()),
      ).toBeGreaterThanOrEqual(4.5)
    })
  })
})
