import { useStoredState } from '@/hooks/useStoredState'

/**
 * Which Start page the kiosk draws: the Cockpit (the Dial) or the Grid (the Start-page widgets
 * on a dense grid, sized to their content). A phone always shows its widget stack, whatever is
 * stored.
 */
export type StartView = 'cockpit' | 'masonry'

export const START_VIEW_CHOICES: readonly StartView[] = ['cockpit', 'masonry']

export const START_VIEW_LABELS: Record<StartView, string> = {
  cockpit: 'Cockpit',
  masonry: 'Grid',
}

const STORAGE_KEY = 'renewvan-dashboard-start-view'

/** The Cockpit, so a kiosk that never touches the setting keeps the Start page it had. */
export const DEFAULT_START_VIEW: StartView = 'cockpit'

function parseStartView(stored: string | null): StartView {
  return START_VIEW_CHOICES.find((choice) => choice === stored) ?? DEFAULT_START_VIEW
}

/**
 * The kiosk's Start view preference. Kiosk-local with no bus topic, persisted like `useMapTheme`;
 * anything stored that is not a known choice reads as the Cockpit.
 */
export function useStartView(): [StartView, (view: StartView) => void] {
  return useStoredState<StartView>(STORAGE_KEY, parseStartView)
}
