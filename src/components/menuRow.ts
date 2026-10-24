/**
 * The phone drawer's row, shared by the controls it holds so they stay one list: transparent, left
 * aligned, a 48px touch target, the text a step above the kiosk's. `justify-start!` because HeroUI's
 * unlayered `.button` centres its content and would beat a plain utility.
 */
export const MENU_ROW = 'min-h-12 justify-start! gap-4 rounded-xl px-3 text-base font-normal'

/** The fixed slot a row's icon sits in, so every label starts on the same line. */
export const MENU_ROW_ICON = 'flex w-6 shrink-0 items-center justify-center'
