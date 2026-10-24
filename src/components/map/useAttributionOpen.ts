import { useEffect, useState } from 'react'

const SHOW = 'maplibregl-compact-show'

/**
 * MapLibre's own attribution (i), closed to begin with, and whether it is open.
 *
 * With `compact` the control is the round (i) button, but MapLibre adds `maplibregl-compact-show`
 * (the open state: the credit text beside the button) on its own schedule, a couple of seconds after
 * the control appears, so it starts open and only closes on a tap or a map move. It has no option or
 * event for either. So this takes the class off the first time MapLibre adds it, and from then on
 * only reports it: every later change is the user's. Resizes leave it be, since MapLibre only adds
 * the class while the control is not yet `maplibregl-compact`.
 *
 * `root` is the map's section: the control is looked up inside it, so another map on the page
 * would never be touched.
 */
export function useAttributionOpen(root: React.RefObject<HTMLElement | null>): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const section = root.current
    if (!section) return
    let classes: MutationObserver | undefined
    let closedAtStart = false

    const watch = (el: Element) => {
      classes = new MutationObserver(() => {
        const shown = el.classList.contains(SHOW)
        if (shown && !closedAtStart) {
          closedAtStart = true
          el.classList.remove(SHOW)
          return
        }
        setOpen(shown)
      })
      classes.observe(el, { attributes: true, attributeFilter: ['class'] })
    }

    const found = section.querySelector('.maplibregl-ctrl-attrib')
    // The control is added by the map once it has loaded, which is after this effect.
    const arrival = new MutationObserver(() => {
      const el = section.querySelector('.maplibregl-ctrl-attrib')
      if (!el) return
      arrival.disconnect()
      watch(el)
    })
    if (found) watch(found)
    else arrival.observe(section, { childList: true, subtree: true })

    return () => {
      arrival.disconnect()
      classes?.disconnect()
    }
  }, [root])

  return open
}
