import { useState, type ReactNode } from 'react'
import { Button, Drawer } from '@heroui/react'
import { Menu } from 'lucide-react'

/**
 * The phone header's menu: the header controls it holds (uplink, theme, alerts) open as full-width
 * rows in a left-side drawer, under the hamburger that opened it. `children` gets `close`, so a row
 * that navigates can dismiss the drawer; Escape, the close control and the backdrop close it too.
 */
export function HeaderMenu({ children }: { children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button isIconOnly variant="ghost" aria-label="Menu" onPress={() => setOpen(true)}>
        <Menu aria-hidden="true" className="size-5" />
      </Button>
      <Drawer.Backdrop variant="opaque" isOpen={open} onOpenChange={setOpen}>
        <Drawer.Content placement="left">
          {/* Unlayered HeroUI CSS sets an opaque `bg-overlay`, so the frosted panel needs `!`. */}
          <Drawer.Dialog className="bg-overlay/60! gap-2 backdrop-blur-sm!">
            <Drawer.Header className="flex-row! items-center justify-between gap-2">
              <Drawer.Heading className="min-w-0 flex-1 truncate text-lg font-semibold">
                Menu
              </Drawer.Heading>
              {/* HeroUI pins the close trigger to the corner (`absolute`); in the row it flows. */}
              <Drawer.CloseTrigger className="static!" />
            </Drawer.Header>
            <Drawer.Body>
              <div className="flex flex-col gap-1">{children(() => setOpen(false))}</div>
            </Drawer.Body>
          </Drawer.Dialog>
        </Drawer.Content>
      </Drawer.Backdrop>
    </>
  )
}
