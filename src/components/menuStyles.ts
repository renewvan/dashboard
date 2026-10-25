/**
 * The phone drawer's row, shared by the controls it holds so they stay one list: a filled, bordered
 * button (so each row reads as something to press, not as a label), left aligned, a 56px touch
 * target for a gloved finger (`docs/design-principles.md`), the text a step above the kiosk's.
 * `!` on what HeroUI's unlayered `.button` would otherwise win: it centres its content and sets its
 * own radius, background and border. The radius is a fixed 16px: the theme's `--radius` is 4px, so
 * its `rounded-*` scale would give 8px here. A row that is the current page switches to the accent look in
 * `MENU_ROW_ACTIVE`.
 */
export const MENU_ROW =
  'min-h-14 justify-start! gap-4 rounded-[16px]! border! border-border! bg-surface/60! px-4 text-base font-medium'

/** The current page's row: the accent tint and border, so it reads as selected at a glance. */
export const MENU_ROW_ACTIVE = 'bg-accent/15! border-accent/50! text-accent!'

/** The fixed slot a row's icon sits in, so every label starts on the same line. */
export const MENU_ROW_ICON = 'flex w-6 shrink-0 items-center justify-center'

/**
 * An icon-only tile in the drawer's bottom row of three (Connection, Theme, Sleep): the row's filled,
 * bordered look at the same 56px height, sharing the width equally so each is a wide touch target.
 * `isIconOnly` buttons are a fixed square in HeroUI (width and height), so the size classes need `!`
 * to take that over, and `flex-1` then shares the row's width equally.
 */
export const MENU_TILE =
  'h-14! min-h-14! w-auto! min-w-0! flex-1 rounded-[16px]! border! border-border! bg-surface/60! px-0'
