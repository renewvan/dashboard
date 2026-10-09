import { Button } from '@heroui/react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export interface SidebarToggleProps {
  collapsed: boolean
  onCollapsedChange: (collapsed: boolean) => void
}

/** Header button that collapses/expands the kiosk rail (`Sidebar`). */
export function SidebarToggle({ collapsed, onCollapsedChange }: SidebarToggleProps) {
  return (
    <Button
      isIconOnly
      variant="ghost"
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-expanded={!collapsed}
      onPress={() => onCollapsedChange(!collapsed)}
      className="size-11 shrink-0 rounded-full"
    >
      {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-5" />}
    </Button>
  )
}
