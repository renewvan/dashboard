import { useState, type ReactNode } from 'react'
import { Button, Drawer } from '@heroui/react'
import { Menu } from 'lucide-react'

/**
 * The phone header's menu: the header controls it holds (uplink, alerts, with theme and Settings pinned at the bottom) open as full-width
 * rows in a left-side drawer, under the hamburger that opened it. `children` gets `close`, so a row
 * that navigates can dismiss the drawer; Escape, the close control and the backdrop close it too.
 * `footer` rows sit at the bottom of the drawer, apart from the list above them. `logo` sits in the
 * header row beside the close control.
 */
export function HeaderMenu({
  children,
  footer,
  logo,
}: {
  children: (close: () => void) => ReactNode
  /** The drawer's header row, left of the close control: the logo, linked to Start. */
  logo?: (close: () => void) => ReactNode
  /** Rows pinned to the bottom of the drawer, below the scrolling list (theme toggle, Settings). */
  footer?: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button isIconOnly variant="ghost" aria-label="Menu" onPress={() => setOpen(true)}>
        <Menu aria-hidden="true" className="size-5" />
      </Button>
      <Drawer.Backdrop variant="opaque" isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content placement="left">
          {/* Unlayered HeroUI CSS sets an opaque `bg-overlay`, so the frosted panel needs `!`. */}
          {/* `px-4 pt-3 pb-4`: the page's own edge margins (Start page, header), not HeroUI's `p-6`. */}
          <Drawer.Dialog
            aria-label="Menu"
            className="bg-overlay/60! gap-2 px-4! pt-3! pb-4! backdrop-blur-sm!"
          >
            {/* No title: the logo says what this is. It and the close control share one row. */}
            <Drawer.Header className="flex-row! items-center justify-between gap-2">
              {logo?.(() => setOpen(false))}
              {/* HeroUI pins the close trigger to the corner (`absolute`); in the row it flows. */}
              <Drawer.CloseTrigger className="static!" />
            </Drawer.Header>
            <Drawer.Body>
              <div className="flex flex-col gap-1">{children(() => setOpen(false))}</div>
            </Drawer.Body>
            {footer && (
              <Drawer.Footer className="border-border flex-col! items-stretch gap-1 border-t pt-2">
                {footer(() => setOpen(false))}
              </Drawer.Footer>
            )}
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  )
}
