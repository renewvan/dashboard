// PROTOTYPE: throwaway. Floating bottom bar that cycles `?variant=` on the host page.
// Dev only: renders nothing in a production build.

import { useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { pushSearchParams } from '@/lib/urlHistory'

export interface VariantMeta {
  key: string
  name: string
}

function setVariant(key: string) {
  const params = new URLSearchParams(window.location.search)
  params.set('variant', key)
  pushSearchParams(params)
}

export function PrototypeSwitcher({
  variants,
  current,
}: {
  variants: readonly VariantMeta[]
  current: string
}) {
  const index = Math.max(
    0,
    variants.findIndex((v) => v.key === current),
  )
  const step = (d: number) =>
    setVariant(variants[(index + d + variants.length) % variants.length].key)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.closest('input, textarea') || t.isContentEditable)) return
      if (e.key === 'ArrowLeft') step(-1)
      else if (e.key === 'ArrowRight') step(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (import.meta.env.PROD) return null
  return (
    <div
      data-testid="prototype-switcher"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black px-2 py-2 text-white shadow-2xl ring-2 ring-white/40"
    >
      <button
        type="button"
        aria-label="Previous variant"
        onClick={() => step(-1)}
        className="grid size-11 place-items-center rounded-full active:bg-white/25"
      >
        <ChevronLeft className="size-6" />
      </button>
      <span className="min-w-52 text-center text-sm font-semibold">
        {variants[index].key} ({variants[index].name})
      </span>
      <button
        type="button"
        aria-label="Next variant"
        onClick={() => step(1)}
        className="grid size-11 place-items-center rounded-full active:bg-white/25"
      >
        <ChevronRight className="size-6" />
      </button>
    </div>
  )
}
