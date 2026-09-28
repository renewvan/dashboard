// PROTOTYPE, throwaway — ticket 05 (kiosk dark-theme mapping).
// Three variants of the Coss/kiosk theme mapping, switchable via `?theme-variant=`.
// Delete this file (and the wiring in App.tsx) once ticket 05 is resolved.
import { useEffect, useState } from 'react'

export const VARIANTS = [
  { key: 'a', label: 'A — Coss default dark' },
  { key: 'b', label: 'B — Coss follows kiosk' },
  { key: 'c', label: 'C — kiosk follows Coss' },
] as const

export type VariantKey = (typeof VARIANTS)[number]['key']

function readVariant(): VariantKey {
  const v = new URLSearchParams(window.location.search).get('theme-variant')
  return VARIANTS.some((variant) => variant.key === v) ? (v as VariantKey) : 'a'
}

export function useThemeVariant(): [VariantKey, (v: VariantKey) => void] {
  const [variant, setVariantState] = useState<VariantKey>(readVariant)

  const setVariant = (v: VariantKey) => {
    const url = new URL(window.location.href)
    url.searchParams.set('theme-variant', v)
    window.history.replaceState(null, '', url)
    setVariantState(v)
  }

  useEffect(() => {
    const onPopState = () => setVariantState(readVariant())
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  return [variant, setVariant]
}

export function PrototypeThemeSwitcher({
  variant,
  onChange,
}: {
  variant: VariantKey
  onChange: (v: VariantKey) => void
}) {
  const index = VARIANTS.findIndex((v) => v.key === variant)
  const cycle = (dir: -1 | 1) => onChange(VARIANTS[(index + dir + VARIANTS.length) % VARIANTS.length].key)

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return
      if (target?.isContentEditable) return
      if (e.key === 'ArrowLeft') cycle(-1)
      if (e.key === 'ArrowRight') cycle(1)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '8px 16px',
        borderRadius: 999,
        background: '#111',
        color: '#fff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        border: '1px solid #ff6b35',
        zIndex: 9999,
        fontSize: 13,
        fontFamily: 'monospace',
      }}
    >
      <button type="button" onClick={() => cycle(-1)} style={{ background: 'none', border: 'none', color: '#ff6b35', cursor: 'pointer', fontSize: 16 }}>
        ←
      </button>
      <span>{VARIANTS[index].label}</span>
      <button type="button" onClick={() => cycle(1)} style={{ background: 'none', border: 'none', color: '#ff6b35', cursor: 'pointer', fontSize: 16 }}>
        →
      </button>
    </div>
  )
}
