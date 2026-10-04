import L from 'leaflet'
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png'
import iconUrl from 'leaflet/dist/images/marker-icon.png'
import shadowUrl from 'leaflet/dist/images/marker-shadow.png'

/**
 * Leaflet's default marker icon resolves its image URLs relative to the
 * page, which breaks under Vite/webpack (the images never get bundled
 * copies at that path) — every `react-leaflet` consumer needs this fix
 * once, before the first `<Marker>` render, or markers render invisible.
 * Standard workaround: delete the broken resolver, point `mergeOptions`
 * at the bundler-resolved asset URLs instead. Side-effecting on import;
 * import this module (not just its absence of exports) wherever a
 * default `<Marker>` is used.
 */
// Leaflet's own prototype carries a private `_getIconUrl` resolver that
// `@types/leaflet` deliberately doesn't expose (undocumented internal,
// not a public shape worth validating) -- named cast, not an inline
// member access, per this repo's cast-access convention.
const iconDefaultPrototype = L.Icon.Default.prototype as typeof L.Icon.Default.prototype & {
  _getIconUrl?: unknown
}
delete iconDefaultPrototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})
