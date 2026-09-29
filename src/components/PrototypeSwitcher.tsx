import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect } from 'react'

/**
 * PROTOTYPE-ONLY (see `skill://prototype`). Floating bottom-center bar for
 * flipping between UI prototype variants via `?variant=`. Never renders in
 * a production build (`import.meta.env.PROD` guard) — a stray import can't
 * ship this to the kiosk. Delete alongside the variants once one wins.
 */
export interface PrototypeVariant {
  key: string
  name: string
}

export interface PrototypeSwitcherProps {
  variants: PrototypeVariant[]
  current: string
  onChange: (key: string) => void
}

export function PrototypeSwitcher({ variants, current, onChange }: PrototypeSwitcherProps) {
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )

  useEffect(() => {
    if (import.meta.env.PROD) return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA'].includes(target.tagName) || target.isContentEditable) return
      if (e.key === 'ArrowLeft') onChange(variants[(index - 1 + variants.length) % variants.length].key)
      if (e.key === 'ArrowRight') onChange(variants[(index + 1) % variants.length].key)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [index, variants, onChange])

  if (import.meta.env.PROD) return null

  const currentVariant = variants[index]

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-amber-400 bg-black/85 px-4 py-2 text-sm text-white shadow-lg">
      <button
        type="button"
        onClick={() => onChange(variants[(index - 1 + variants.length) % variants.length].key)}
        className="rounded-full p-1 hover:bg-white/10"
        aria-label="Previous variant"
      >
        <ChevronLeft className="size-5" />
      </button>
      <span className="font-mono">
        {currentVariant.key} <span className="text-white/60">({currentVariant.name})</span>
      </span>
      <button
        type="button"
        onClick={() => onChange(variants[(index + 1) % variants.length].key)}
        className="rounded-full p-1 hover:bg-white/10"
        aria-label="Next variant"
      >
        <ChevronRight className="size-5" />
      </button>
    </div>
  )
}
