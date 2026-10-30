import { createContext, useContext } from 'react'
import { iconKey, type IconEntity } from '@/lib/entityIcons'

/**
 * The shared entity icons (`renewvan/hub/icons`): `<entity>/<id>` to a lucide component name. Provided
 * once at the shell, so the Levels page, the Start page and Settings all draw an instance with the
 * same icon; empty (every consumer falls back to its own icon) outside it.
 */
export const EntityIconsContext = createContext<Readonly<Record<string, string>>>({})

/** The icon name picked for one instance, or `undefined` when nobody picked one. */
export function useEntityIcon(entity: IconEntity, id: string): string | undefined {
  return useContext(EntityIconsContext)[iconKey(entity, id)]
}

/** The whole map, for a consumer that looks several instances up at once. */
export function useEntityIcons(): Readonly<Record<string, string>> {
  return useContext(EntityIconsContext)
}
