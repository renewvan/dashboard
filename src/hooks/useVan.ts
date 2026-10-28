import { useCallback } from 'react'
import { useStoredState } from '@/hooks/useStoredState'

/**
 * What the kiosk knows about its own van: free text the owner types in Settings › Advanced › Van.
 * Every field is a string, empty until filled in: `kms` is kept as typed (with the owner's own
 * separators or unit) because nothing computes with it.
 */
export interface Van {
  name: string
  brand: string
  model: string
  kms: string
  plate: string
  /** The van's colour on the map, `#rrggbb`; empty is the theme accent (the default blue). */
  color: string
}

/** The fields in the order Settings shows them. */
export const VAN_FIELDS: readonly Exclude<keyof Van, 'color'>[] = [
  'name',
  'brand',
  'model',
  'kms',
  'plate',
]

export const VAN_LABELS: Record<keyof Van, string> = {
  name: 'Name',
  brand: 'Brand',
  model: 'Model',
  kms: 'Kms.',
  plate: 'Plate',
  color: 'Colour',
}

const STORAGE_KEY = 'renewvan-dashboard-van'

/** Swatches Settings offers beside the default blue and the free picker. */
export const VAN_COLOR_PRESETS: readonly string[] = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#a855f7',
  '#ec4899',
  '#e5e7eb',
  '#1f2937',
]

const HEX_COLOR = /^#[0-9a-f]{6}$/i

const EMPTY_VAN: Van = { name: '', brand: '', model: '', kms: '', plate: '', color: '' }

function serializeVan(van: Van): string {
  return JSON.stringify(van)
}

function parseVan(raw: string | null): Van {
  try {
    const stored: unknown = JSON.parse(raw ?? 'null')
    if (typeof stored !== 'object' || stored === null) return EMPTY_VAN
    // Field by field, so an edited or older value with a wrong type reads as empty for that field
    // alone instead of discarding the rest.
    const record = stored as Record<string, unknown>
    const read = (key: keyof Van) => (typeof record[key] === 'string' ? record[key] : '')
    return {
      name: read('name'),
      brand: read('brand'),
      model: read('model'),
      kms: read('kms'),
      plate: read('plate'),
      color: HEX_COLOR.test(read('color')) ? read('color') : '',
    }
  } catch {
    return EMPTY_VAN
  }
}

/**
 * The van's details. Kiosk-local with no bus topic (the hub has no schema for them yet), persisted
 * like `useMapTheme` so they survive a reload or power cycle. `setField` changes one field and
 * keeps the others.
 */
export function useVan(): [Van, (field: keyof Van, value: string) => void] {
  const [van, setVan] = useStoredState<Van>(STORAGE_KEY, parseVan, serializeVan)

  const setField = useCallback(
    (field: keyof Van, value: string) => setVan((current) => ({ ...current, [field]: value })),
    [setVan],
  )

  return [van, setField]
}
