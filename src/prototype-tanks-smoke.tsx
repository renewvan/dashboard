// PROTOTYPE-ONLY throwaway smoke harness, not part of the app. Delete
// alongside prototype-tanks-smoke.html once ticket 01 resolves.
import { createRoot } from 'react-dom/client'
import './index.css'
import { VariantA, VariantB, VariantC } from './tabs/TanksTab.prototype-variants'
import type { Tank } from './types'

const twoTanks: Record<string, Tank> = {
  fresh: { fluid_type: 'fresh_water', capacity_l: 70, level_pct: 37.4, status: 'ok' },
  grey: { fluid_type: 'grey_water', capacity_l: 70, level_pct: 0, status: 'open_circuit' },
}
const oneTank: Record<string, Tank> = {
  fresh: { fluid_type: 'fresh_water', capacity_l: 70, level_pct: 82, status: 'ok' },
}
const fourTanks: Record<string, Tank> = {
  fresh: { fluid_type: 'fresh_water', capacity_l: 70, level_pct: 37.4, status: 'ok' },
  grey: { fluid_type: 'grey_water', capacity_l: 70, level_pct: 0, status: 'open_circuit' },
  black: { fluid_type: 'black_water', capacity_l: 50, level_pct: 61, status: 'ok' },
  fuel: { fluid_type: 'fuel', capacity_l: 120, level_pct: 12, status: 'ok' },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: 'var(--text)', fontFamily: 'sans-serif', marginBottom: 12 }}>{title}</h2>
      {children}
    </div>
  )
}

function Smoke() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      {(['A', 'B', 'C'] as const).map((v) => {
        const V = { A: VariantA, B: VariantB, C: VariantC }[v]
        return (
          <div key={v}>
            <Section title={`Variant ${v} — 2 tanks (fresh ok, grey fault)`}>
              <V tanks={twoTanks} />
            </Section>
            <Section title={`Variant ${v} — 1 tank`}>
              <V tanks={oneTank} />
            </Section>
            <Section title={`Variant ${v} — 4 tanks`}>
              <V tanks={fourTanks} />
            </Section>
          </div>
        )
      })}
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Smoke />)
