import { memo, useState, type ReactNode } from 'react'
import { Breadcrumbs, Drawer, ScrollShadow } from '@heroui/react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useSettingsNavStyle, type SettingsNavStyle } from '@/hooks/useSettingsNavStyle'
import { nodesSummary } from '@/lib/nodes'
import { DisplayView } from './DisplayView'
import { GroupRow } from './GroupRow'
import { NavigationView } from './NavigationView'
import { NodesView } from './NodesView'
import { useSettings } from './SettingsContext'

type SettingsView = 'list' | 'nodes' | 'general' | 'display' | 'navigation' | 'connectivity'
type SubView = Exclude<SettingsView, 'list'>

const PANEL = 'border-border bg-surface overflow-hidden rounded-2xl border'

/** A group with nothing to show yet: say so plainly instead of faking rows. */
function EmptyGroup() {
  return <p className={`${PANEL} text-muted px-3.5 py-3 text-sm`}>Nothing to configure yet.</p>
}

/** General's pages: Display. */
function GeneralView({ onOpen }: { onOpen: (view: SubView) => void }) {
  return (
    <div className={`${PANEL} divide-border divide-y`}>
      <GroupRow
        label="Display"
        description="Brightness, auto-sleep, navigation"
        onOpen={() => onOpen('display')}
      />
    </div>
  )
}

const VIEWS: Record<SubView, { title: string; parent: SettingsView }> = {
  nodes: { title: 'Nodes', parent: 'list' },
  general: { title: 'General', parent: 'list' },
  display: { title: 'Display', parent: 'general' },
  navigation: { title: 'Navigation', parent: 'display' },
  connectivity: { title: 'Connectivity', parent: 'list' },
}

const SUB_VIEWS = Object.keys(VIEWS) as SubView[]

/** `list → … → view`, root excluded, outermost first. */
function trailTo(view: SubView): SubView[] {
  const trail: SubView[] = []
  for (let v: SettingsView = view; v !== 'list'; v = VIEWS[v].parent) trail.unshift(v)
  return trail
}

/**
 * Settings as a drill-down tree: the top list, then one group's view per
 * level. The Navigation style opens a view either as a subpage (the view
 * replaces the page under a breadcrumb trail) or as a sheet (the top list
 * stays and the view slides in from the right). Memoised: it takes no props
 * and only re-renders when the Settings context value changes.
 */
export const SettingsTab = memo(function SettingsTab() {
  const { nodes } = useSettings()
  const isMobile = useIsMobile()
  const [storedNavStyle, setStoredNavStyle] = useSettingsNavStyle()
  // Derived at render and never written: the stored kiosk choice survives a phone visit.
  const navStyle: SettingsNavStyle = isMobile ? 'subpage' : storedNavStyle
  const [view, setView] = useState<SettingsView>('list')

  const content = (id: SubView): ReactNode => {
    switch (id) {
      case 'nodes':
        return <NodesView />
      case 'general':
        return <GeneralView onOpen={setView} />
      case 'display':
        return <DisplayView navStyle={navStyle} onOpenNavigation={() => setView('navigation')} />
      case 'navigation':
        return (
          <NavigationView style={storedNavStyle} onChange={setStoredNavStyle} isMobile={isMobile} />
        )
      case 'connectivity':
        return <EmptyGroup />
    }
  }

  const topList = (
    <>
      <h1 className="px-1 text-base font-medium">Settings</h1>
      <div className={`${PANEL} divide-border divide-y`}>
        <GroupRow label="Nodes" description={nodesSummary(nodes)} onOpen={() => setView('nodes')} />
        <GroupRow label="General" description="Display" onOpen={() => setView('general')} />
        <GroupRow
          label="Connectivity"
          description="Nothing to configure yet"
          onOpen={() => setView('connectivity')}
        />
      </div>
    </>
  )

  return (
    <section
      aria-label="Settings"
      data-testid="pane-settings"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ScrollShadow hideScrollBar className="min-h-0 flex-1">
        <div className="flex w-full max-w-xl min-w-0 flex-col gap-3 p-4">
          {navStyle === 'sheet' || view === 'list' ? (
            topList
          ) : (
            <>
              <Breadcrumbs className="px-1">
                <Breadcrumbs.Item id="list" onPress={() => setView('list')}>
                  Settings
                </Breadcrumbs.Item>
                {trailTo(view).map((id) => (
                  <Breadcrumbs.Item
                    key={id}
                    id={id}
                    onPress={id === view ? undefined : () => setView(id)}
                  >
                    {VIEWS[id].title}
                  </Breadcrumbs.Item>
                ))}
              </Breadcrumbs>
              {content(view)}
            </>
          )}
        </div>
      </ScrollShadow>
      {navStyle === 'sheet' &&
        SUB_VIEWS.map((id) => (
          // No `Drawer` root: it wraps a React Aria `DialogTrigger`, which warns when nothing
          // pressable registers; the controlled backdrop needs no trigger.
          <Drawer.Backdrop
            key={id}
            isOpen={view === id}
            // Closing (Escape, close control, backdrop) steps back to the parent view.
            onOpenChange={(open) => setView(open ? id : VIEWS[id].parent)}
          >
            <Drawer.Content placement="right">
              <Drawer.Dialog>
                <Drawer.CloseTrigger />
                <Drawer.Header>
                  <Drawer.Heading>{VIEWS[id].title}</Drawer.Heading>
                </Drawer.Header>
                {/* All view content stays in the body: a Slider outside it can start a drag-to-dismiss. */}
                <Drawer.Body>{content(id)}</Drawer.Body>
              </Drawer.Dialog>
            </Drawer.Content>
          </Drawer.Backdrop>
        ))}
    </section>
  )
})
