/**
 * Opt-in `window.matchMedia` stub for jsdom (which has none), driven by a
 * settable viewport width. Call `stubMatchMedia(width)` in a test (or
 * `beforeEach`) and `setViewportWidth(n)` inside `act()` to cross a
 * breakpoint; listeners registered through `addEventListener('change')`
 * fire when a query's result flips. Understands `(min-width: Npx)`,
 * `(max-width: Npx)` joined by `and`; any other feature (e.g. `pointer`)
 * evaluates to `false`.
 */

type Listener = (event: MediaQueryListEvent) => void

export interface MatchMediaStub {
  /** Change the simulated viewport width and notify affected listeners. */
  setViewportWidth: (width: number) => void
  /** Remove the stub from `window`. */
  restore: () => void
}

function evaluate(query: string, width: number): boolean {
  const features = query
    .split(/\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean)
  if (features.length === 0) return false
  return features.every((feature) => {
    const match = /^\(\s*(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)$/.exec(feature)
    if (!match) return false
    const px = Number(match[2])
    return match[1] === 'min' ? width >= px : width <= px
  })
}

export function stubMatchMedia(initialWidth: number): MatchMediaStub {
  let width = initialWidth
  const lists = new Set<{ query: string; matches: boolean; listeners: Set<Listener> }>()

  const matchMedia = (query: string): MediaQueryList => {
    const state = { query, matches: evaluate(query, width), listeners: new Set<Listener>() }
    lists.add(state)
    const mql = {
      media: query,
      onchange: null,
      get matches() {
        return state.matches
      },
      addEventListener: (type: string, listener: Listener) => {
        if (type === 'change') state.listeners.add(listener)
      },
      removeEventListener: (type: string, listener: Listener) => {
        if (type === 'change') state.listeners.delete(listener)
      },
      addListener: (listener: Listener) => state.listeners.add(listener),
      removeListener: (listener: Listener) => state.listeners.delete(listener),
      dispatchEvent: () => false,
    }
    return mql as unknown as MediaQueryList
  }

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMedia,
  })

  return {
    setViewportWidth(next) {
      width = next
      for (const state of lists) {
        const matches = evaluate(state.query, width)
        if (matches === state.matches) continue
        state.matches = matches
        for (const listener of state.listeners) {
          listener({ matches, media: state.query } as MediaQueryListEvent)
        }
      }
    },
    restore() {
      lists.clear()
      Reflect.deleteProperty(window, 'matchMedia')
    },
  }
}
