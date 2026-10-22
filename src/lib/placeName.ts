/**
 * Coordinates rounded to ~110 m (3 decimals). A stationary GPS wanders by metres, and Nominatim's
 * usage policy allows about one request a second, so the place name is looked up per rounded cell,
 * not per fix.
 */
export function placeCell(lat: number, lon: number): { lat: number; lon: number } {
  return { lat: Math.round(lat * 1000) / 1000, lon: Math.round(lon * 1000) / 1000 }
}

export function reverseGeocodeUrl(lat: number, lon: number): string {
  return `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

/**
 * The place to show from a Nominatim reverse-geocode body: the village, else the town, else the
 * city, else the full `display_name`; null for anything that is not that shape, or has none of
 * them (Nominatim answers `{ error }` for coordinates in the sea or a desert).
 */
export function parsePlaceName(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null
  const { address, display_name } = body as { address?: unknown; display_name?: unknown }
  if (typeof address === 'object' && address !== null) {
    const { village, town, city } = address as Record<string, unknown>
    const name = nonEmptyString(village) ?? nonEmptyString(town) ?? nonEmptyString(city)
    if (name) return name
  }
  return nonEmptyString(display_name)
}
