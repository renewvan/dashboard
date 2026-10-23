import { useCallback, useEffect, useState } from 'react'

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
}

/** The fields in the order Settings shows them. */
export const VAN_FIELDS: readonly (keyof Van)[] = ['name', 'brand', 'model', 'kms', 'plate']

export const VAN_LABELS: Record<keyof Van, string> = {
  name: 'Name',
  brand: 'Brand',
  model: 'Model',
  kms: 'Kms',
  plate: 'Plate',
}

const STORAGE_KEY = 'renewvan-dashboard-van'

const EMPTY_VAN: Van = { name: '', brand: '', model: '', kms: '', plate: '' }

function readStoredVan(): Van {
  if (typeof window === 'undefined') return EMPTY_VAN
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
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
  const [van, setVan] = useState<Van>(readStoredVan)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(van))
  }, [van])

  const setField = useCallback(
    (field: keyof Van, value: string) => setVan((current) => ({ ...current, [field]: value })),
    [],
  )

  return [van, setField]
}
