import { Plug, Power, type LucideIcon } from 'lucide-react'

/**
 * Dashboard-local presentation config for the Relays page, keyed by channel id. None of it is on
 * the wire (hub ADR 0013): groups, icons and critical loads are a consumer's concern.
 *
 * It ships EMPTY on purpose. Which channel switches what, and which loads are critical, are the
 * owner's to say, and an icon is only as honest as the channel's name: a guess would label a
 * pump as a light. Until a channel is listed it lands in "Unassigned" with a neutral glyph and
 * switches without a confirmation. To configure the van, fill these in:
 *
 *   panels:  [{ title: 'Water', icon: Droplets, ids: ['relay_03'] }]
 *   icons:   { relay_03: Droplets }
 *   critical: ['relay_03']
 */
export interface RelayPanelConfig {
  title: string
  icon: LucideIcon
  ids: string[]
}

export const relayPanels: RelayPanelConfig[] = []

/** Per-channel icons, only for a load the owner has named. */
export const relayIcons: Record<string, LucideIcon> = {}

/** Loads that ask for confirmation before switching (a pump, a heater, an inverter enable). */
export const criticalRelayIds: string[] = []

/** Shown for a channel with no honest icon, so the page never guesses what it switches. */
export const FALLBACK_RELAY_ICON: LucideIcon = Power

const UNASSIGNED: Omit<RelayPanelConfig, 'ids'> = { title: 'Unassigned', icon: Plug }

export interface RelayPanel extends RelayPanelConfig {
  /** Channel ids to show, in configured order; only ids that are on the bus. */
  ids: string[]
}

/**
 * Places every channel on the bus in a panel. A configured panel keeps only the ids that exist;
 * an id on the bus that no panel lists goes to "Unassigned" (sorted), so a new relay always
 * appears. A channel listed twice stays in the first panel that lists it. Empty panels drop out.
 */
export function panelsFor(
  ids: readonly string[],
  config: readonly RelayPanelConfig[] = relayPanels,
): RelayPanel[] {
  const present = new Set(ids)
  const placed = new Set<string>()
  const panels: RelayPanel[] = config
    .map((panel) => ({
      ...panel,
      ids: panel.ids.filter((id) => {
        if (!present.has(id) || placed.has(id)) return false
        placed.add(id)
        return true
      }),
    }))
    .filter((panel) => panel.ids.length > 0)

  const rest = ids.filter((id) => !placed.has(id)).sort()
  if (rest.length > 0) panels.push({ ...UNASSIGNED, ids: rest })
  return panels
}
