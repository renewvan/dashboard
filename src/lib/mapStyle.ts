import { DARK, LIGHT, layers, type Flavor } from '@protomaps/basemaps'
import type { StyleSpecification } from 'maplibre-gl'

/** The two looks the map has, one per app theme. They are Protomaps flavor names. */
export type MapTheme = 'light' | 'dark'

/**
 * Where the Map page's basemap assets are served from: the dashboard's own origin, so the van's map
 * needs no internet. The image's nginx serves `/maps/` (`nginx.conf`): the region's `basemap.pmtiles`
 * is mounted there on the hub, and the glyph (font) and sprite assets are baked into the image
 * (`Dockerfile`). The paths are fixed rather than env-configured, like `/mqtt`.
 */
export const BASEMAP_PMTILES_PATH = '/maps/basemap.pmtiles'
const GLYPHS_PATH = '/maps/fonts/{fontstack}/{range}.pbf'
const SPRITE_DIR = '/maps/sprites/v4'

/** The basemap source's name in the style; the layers refer to it. */
const SOURCE = 'protomaps'

/**
 * Protomaps' `dark` flavor with the structure lifted. Stock `dark` keeps land (`#1f1f1f`), roads
 * (`#3d3d3d`) and buildings (`#111111`) inside one very dark band, so on the kiosk's small screen
 * the streets barely separate from the ground. Here land, buildings, roads and labels are spread
 * out: buildings sit between land and roads, roads are clearly lighter than both, and the road and
 * place labels are brighter. Water, parks, POI colours and the sprite are stock `dark`, so the icons
 * (`sprites/v4/dark`) still match the layers that use them.
 */
const DARK_LIFTED: Flavor = {
  ...DARK,
  earth: '#2e3138',
  buildings: '#3b3f48',
  industrial: '#2c2f35',
  hospital: '#33312f',
  school: '#34312f',
  wood_b: '#2c302f',
  scrub_b: '#2d3130',
  glacier: '#30333a',
  aerodrome: '#2d3036',
  minor_a: '#5b606b',
  minor_b: '#4d525c',
  other: '#4d525c',
  major: '#6a707c',
  highway: '#868c99',
  major_casing_early: '#2e3138',
  major_casing_late: '#2e3138',
  highway_casing_early: '#2e3138',
  highway_casing_late: '#2e3138',
  roads_label_minor: '#a3a9b5',
  roads_label_minor_halo: '#2e3138',
  roads_label_major: '#c4c9d3',
  roads_label_major_halo: '#2e3138',
  subplace_label: '#a3a9b5',
  subplace_label_halo: '#2e3138',
  city_label: '#d0d4dc',
  city_label_halo: '#2e3138',
}

/**
 * Protomaps' `light` flavor with colour and separation added. Stock `light` paints land `#e2dfda`,
 * buildings `#cccccc` and roads `#ebebeb`/`#ffffff` in one pale grey, so it reads as a monochrome
 * X-ray with only the water in colour. Here the land is a warm paper tone, buildings a clear step
 * darker, roads white with a visible casing so they outline against the land, highways amber, and
 * parks and water carry their own hue. Labels are darker for contrast. The icon sprite is stock
 * `light`, so the POI icons still match.
 */
const LIGHT_WARM: Flavor = {
  ...LIGHT,
  background: '#d9d4c7',
  earth: '#f1ede4',
  buildings: '#ddd6c8',
  industrial: '#e6e2d6',
  hospital: '#f1dcd7',
  school: '#eddfc9',
  park_b: '#b3d79f',
  wood_b: '#c8deb5',
  scrub_b: '#d3e2bf',
  glacier: '#eef3f4',
  aerodrome: '#e4e0d6',
  water: '#a9d6ea',
  minor_a: '#ffffff',
  minor_b: '#fbfaf6',
  other: '#f9f7f1',
  major: '#ffffff',
  highway: '#fbd98a',
  major_casing_early: '#cbc5b6',
  major_casing_late: '#cbc5b6',
  highway_casing_early: '#d4b25e',
  highway_casing_late: '#d4b25e',
  roads_label_minor: '#6b665c',
  roads_label_major: '#5a554b',
  subplace_label: '#6b665c',
  city_label: '#2f2c27',
}

/** The flavor drawn under each theme. */
const FLAVORS: Record<MapTheme, Flavor> = { dark: DARK_LIFTED, light: LIGHT_WARM }

/** Protomaps' OSM-derived tiles are ODbL: the attribution is a licence condition, so it stays. */
const ATTRIBUTION =
  '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>'

/**
 * The basemap as a MapLibre style: Protomaps vector tiles read from one local PMTiles archive over
 * HTTP range requests (the `pmtiles://` protocol, registered by `useMapLibreSetup`), drawn in the
 * flavor that matches the app's theme: the `light` map under the light theme, `dark` under the dark
 * one. The tiles are the same either way; only the colours and the icon sprite differ (fonts are
 * shared). `origin` is the page's origin: MapLibre resolves the glyph and sprite URLs inside a
 * worker, where a bare path has no base to resolve against.
 *
 * Where the van is outside the extract, or the file is missing, the tiles simply fail to load and
 * the map shows the style's empty background with the van on it; nothing falls back to the network.
 */
export function basemapStyle(origin: string, theme: MapTheme): StyleSpecification {
  return {
    version: 8,
    glyphs: `${origin}${GLYPHS_PATH}`,
    sprite: `${origin}${SPRITE_DIR}/${theme}`,
    sources: {
      [SOURCE]: {
        type: 'vector',
        url: `pmtiles://${origin}${BASEMAP_PMTILES_PATH}`,
        attribution: ATTRIBUTION,
      },
    },
    layers: layers(SOURCE, FLAVORS[theme], { lang: 'en' }),
  }
}
