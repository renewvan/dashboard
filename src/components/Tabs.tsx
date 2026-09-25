import type { ReactNode } from 'react'
import './Tabs.css'

export interface Tab {
  id: string
  label: string
  content: ReactNode
}

export interface TabsProps {
  tabs: Tab[]
  activeId: string
  onSelect: (id: string) => void
}

/**
 * Domain tab bar (Tanks / Power / Switches) + the active tab's panel, per
 * the winning `prototype/dashboard-06` variant C layout. Same tabbed
 * interaction at every supported width (kiosk/laptop/phone).
 */
export function Tabs({ tabs, activeId, onSelect }: TabsProps) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  return (
    <div className="tabs">
      <div className="tabs__bar" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={tab.id === active.id}
            className={`tabs__tab${tab.id === active.id ? ' tabs__tab--active' : ''}`}
            onClick={() => onSelect(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tabs__panel" role="tabpanel" data-testid="tab-panel">
        {active.content}
      </div>
    </div>
  )
}
