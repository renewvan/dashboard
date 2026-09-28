import type { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import lockupWhite from '../../assets/logo/renewvan-lockup-white.svg'
import symbolWhite from '../../assets/logo/renewvan-symbol-white.svg'
import { TabsList, TabsTab } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export interface NavItem {
  id: string
  label: string
  icon: ReactNode
}

export interface SidebarProps {
  items: NavItem[]
  collapsed: boolean
  onToggleCollapsed: () => void
}

/**
 * Left nav rail: brand mark, a vertical Coss `Tabs` list (selection state
 * lives on the `Tabs.Root` this renders inside of, in `App.tsx`), and a
 * collapse toggle. Collapsed shows icons only; expanded shows icon + label.
 * The selected item's pill (`.sidebar-nav [data-slot="tab-indicator"]` in
 * `index.css`) bleeds a rounded, concave-cornered "bubble" out to the
 * content edge, per the reference layout.
 */
export function Sidebar({ items, collapsed, onToggleCollapsed }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full shrink-0 flex-col justify-between bg-card transition-[width] duration-200',
        collapsed ? 'w-16' : 'w-56',
      )}
    >
      <div className="flex min-h-0 flex-col gap-4">
        <div className="flex h-14 shrink-0 items-center px-4">
          <img
            src={collapsed ? symbolWhite : lockupWhite}
            alt="renewvan"
            className={collapsed ? 'h-7 w-7' : 'h-6 w-auto'}
          />
        </div>
        <TabsList className="sidebar-nav w-full flex-col items-stretch justify-start gap-1 rounded-none bg-transparent p-0 pl-2">
          {items.map((item) => (
            <TabsTab
              key={item.id}
              value={item.id}
              data-testid={`nav-${item.id}`}
              className="justify-start gap-3 px-3.5 py-3"
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </TabsTab>
          ))}
        </TabsList>
      </div>
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        data-testid="sidebar-toggle"
        className="m-2 flex shrink-0 items-center justify-center rounded-lg p-2.5 text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>
    </aside>
  )
}
