# Basemap assets

The Map page draws a Protomaps vector basemap with no internet (`src/lib/mapStyle.ts`). It needs
three kinds of file, all served from this directory at `/maps/`:

| Path              | What                                                 | Where it comes from                           |
| ----------------- | ---------------------------------------------------- | --------------------------------------------- |
| `fonts/`          | Glyph PBFs for the three label font stacks           | vendored here (below)                         |
| `sprites/v4/`     | Icon spritesheets for the `light` and `dark` flavors | vendored here (below)                         |
| `basemap.pmtiles` | The region's tiles (not in git, not in image)        | mounted on the hub; see `docs/offline-map.md` |

## Vendored files

Copied unmodified from [`protomaps/basemaps-assets`](https://github.com/protomaps/basemaps-assets)
at commit `028c18f713baecad011301ff7a69acc39bcc2ae7`: `fonts/Noto Sans {Regular,Medium,Italic}`
(the only stacks either flavor requests), `fonts/OFL.txt` (the fonts are SIL OFL 1.1), and
`sprites/v4/{light,dark}{,@2x}.{json,png}`. The map follows the app's theme (`mapStyle.ts`), so
both flavors are needed.

If the flavor in `mapStyle.ts` changes, or `@protomaps/basemaps` starts asking for another font
stack, re-vendor from the same repo. A missing glyph range only blanks that label, but a missing
sprite hides every icon.
