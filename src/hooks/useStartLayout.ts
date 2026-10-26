import { useStoredState } from '@/hooks/useStoredState'

/** Every widget the phone's Start page can show; each one is a component in `components/start/widgets`. */
export const START_WIDGET_IDS = [
  'weather',
  'map',
  'energy',
  'solar',
  'tilt',
  'fresh-water',
  'grey-water',
] as const

export type StartWidgetId = (typeof START_WIDGET_IDS)[number]

/** The phone Start page as shipped: every widget, in this order. */
export const DEFAULT_START_LAYOUT: readonly StartWidgetId[] = START_WIDGET_IDS

const STORAGE_KEY = 'renewvan-dashboard-start-layout'

function isWidgetId(value: unknown): value is StartWidgetId {
  return START_WIDGET_IDS.some((id) => id === value)
}

/**
 * The stored layout: a JSON list of widget ids, in display order; a widget that is not listed is
 * not shown. Unknown ids (a widget removed in a later version) and repeats are dropped, so an old
 * or edited value never breaks the page. An empty list is a real choice (every widget removed);
 * nothing stored, or something that is not a list, reads as the default.
 */
export function parseStartLayout(stored: string | null): readonly StartWidgetId[] {
  if (stored === null) return DEFAULT_START_LAYOUT
  try {
    const parsed: unknown = JSON.parse(stored)
    if (!Array.isArray(parsed)) return DEFAULT_START_LAYOUT
    return [...new Set(parsed.filter(isWidgetId))]
  } catch {
    return DEFAULT_START_LAYOUT
  }
}

/** The layout with the widget at `from` taken out and put back at `to`; unchanged if either is out of range or they are equal. */
export function reorderWidget(
  layout: readonly StartWidgetId[],
  from: number,
  to: number,
): readonly StartWidgetId[] {
  const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < layout.length
  if (!inRange(from) || !inRange(to) || from === to) return layout
  const next = [...layout]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/** The layout with `id` moved one place up (`-1`) or down (`1`); unchanged at either end or if it is not listed. */
export function moveWidget(
  layout: readonly StartWidgetId[],
  id: StartWidgetId,
  by: -1 | 1,
): readonly StartWidgetId[] {
  const from = layout.indexOf(id)
  return from === -1 ? layout : reorderWidget(layout, from, from + by)
}

function serializeStartLayout(layout: readonly StartWidgetId[]): string {
  return JSON.stringify(layout)
}

/**
 * Which widgets the phone Start page shows and in what order. Kiosk-local preference with no bus
 * topic, persisted like `usePowerLayout`. Add, remove and reorder by setting a new list.
 */
export function useStartLayout() {
  return useStoredState<readonly StartWidgetId[]>(
    STORAGE_KEY,
    parseStartLayout,
    serializeStartLayout,
  )
}
