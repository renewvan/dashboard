import type { ReactNode } from 'react'
import { Tabs as TabsRoot, TabsList, TabsPanel, TabsTab } from '@/components/ui/tabs'

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
 * Domain tab bar (Tanks / Power / Switches / Settings) + the active tab's
 * panel, built on Coss's Base UI-backed Tabs primitive
 * (`src/components/ui/tabs.tsx`).
 */
export function Tabs({ tabs, activeId, onSelect }: TabsProps) {
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]

  return (
    <TabsRoot
      value={active.id}
      onValueChange={(value) => onSelect(value as string)}
      className="mb-4"
    >
      <TabsList className="w-full">
        {tabs.map((tab) => (
          <TabsTab key={tab.id} value={tab.id}>
            {tab.label}
          </TabsTab>
        ))}
      </TabsList>
      {tabs.map((tab) => (
        <TabsPanel key={tab.id} value={tab.id}>
          {tab.content}
        </TabsPanel>
      ))}
    </TabsRoot>
  )
}
