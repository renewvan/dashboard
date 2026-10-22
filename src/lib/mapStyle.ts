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
 * Protomaps' `dark` flavor with the structure lifted, but only part of the way. Stock `dark` keeps
 * land (`#1f1f1f`), roads (`#3d3d3d`) and buildings (`#111111`) inside one very dark band, so on the
 * kiosk's small screen the streets barely separate from the ground. A first lift (land `#2e3138`)
 * fixed that but glared at night, so this sits between the two: land, buildings, roads and labels
 * are still spread out (buildings between land and roads, roads clearly lighter than both, brighter
 * road and place labels), with the whole range pulled down toward stock. Water, parks, POI colours
 * and the sprite are stock `dark`, so the icons (`sprites/v4/dark`) still match the layers that
 * use them.
 */
const DARK_LIFTED: Flavor = {
  ...DARK,
  earth: '#262830',
  buildings: '#2d3038',
  industrial: '#25272d',
  hospital: '#2b2a29',
  school: '#2c2a29',
  wood_b: '#252928',
  scrub_b: '#262a29',
  glacier: '#272a2f',
  aerodrome: '#26282d',
  minor_a: '#4f525b',
  minor_b: '#40444c',
  other: '#40444c',
  major: '#525761',
  highway: '#70757f',
  major_casing_early: '#262830',
  major_casing_late: '#262830',
  highway_casing_early: '#262830',
  highway_casing_late: '#262830',
  roads_label_minor: '#8a909c',
  roads_label_minor_halo: '#262830',
  roads_label_major: '#a9aeb9',
  roads_label_major_halo: '#262830',
  subplace_label: '#8a909c',
  subplace_label_halo: '#262830',
  city_label: '#b4b8c1',
  city_label_halo: '#262830',
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
