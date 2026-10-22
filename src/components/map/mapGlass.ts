/**
 * The look of everything laid over the map (the readout and the zoom buttons): dark glass, a faint
 * white border, white text and one corner radius. The map behind is dark in either theme, so these
 * do not follow the theme, and they live in one place so the two cannot drift apart. `!` is for
 * HeroUI's `Button`, whose own theme colours and radius would otherwise win; on a plain `div` it
 * changes nothing.
 */
export const MAP_GLASS =
  'rounded-xl! border! border-white/10! bg-black/60! text-white! backdrop-blur-md'
