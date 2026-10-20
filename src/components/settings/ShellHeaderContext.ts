import { createContext, useContext, useLayoutEffect } from 'react'

/**
 * How a page asks the app shell to hide its header content (logo, clock, status buttons) so the
 * page's own bar can take that place. The default is a no-op, so a page rendered without the
 * shell (tests, any other host) still works and simply shows its bar inline.
 */
export const ShellHeaderContext = createContext<(hidden: boolean) => void>(() => {})

/** While `hidden`, the shell shows no header content; released on unmount or when `false`. */
export function useHideShellHeader(hidden: boolean): void {
  const setHidden = useContext(ShellHeaderContext)
  useLayoutEffect(() => {
    setHidden(hidden)
    return () => setHidden(false)
  }, [hidden, setHidden])
}
