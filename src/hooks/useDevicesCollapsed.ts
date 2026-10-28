import { useStoredState } from '@/hooks/useStoredState'

const STORAGE_KEY = 'renewvan-dashboard-devices-collapsed'

/** The entity types nothing collapsed, so Devices opens with every section showing. */
const NONE: readonly string[] = []

function parseCollapsed(stored: string | null): readonly string[] {
  if (stored === null) return NONE
  try {
    const parsed: unknown = JSON.parse(stored)
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === 'string') : NONE
  } catch {
    return NONE
  }
}

const serializeCollapsed = (types: readonly string[]) => JSON.stringify(types)

/**
 * Which entity-type sections of Settings › Devices (By entity) are collapsed, by entity type.
 * Kiosk-local and persisted like `useDevicesSort`, so a section folded away stays folded when the
 * list is reached again; anything stored that is not a list of strings reads as none collapsed.
 */
export function useDevicesCollapsed() {
  const [collapsed, setCollapsed] = useStoredState<readonly string[]>(
    STORAGE_KEY,
    parseCollapsed,
    serializeCollapsed,
  )
  const toggle = (type: string) =>
    setCollapsed((current) =>
      current.includes(type) ? current.filter((t) => t !== type) : [...current, type],
    )
  return { isCollapsed: (type: string) => collapsed.includes(type), toggle }
}
