import { memo, useState, type ReactNode } from 'react'
import { Breadcrumbs, ScrollShadow } from '@heroui/react'
import { nodesSummary } from '@/lib/nodes'
import { AlertsView } from './AlertsView'
import { CellularView } from './CellularView'
import { ConnectivityView } from './ConnectivityView'
import { DisplayView } from './DisplayView'
import { GeneralView } from './GeneralView'
import { GroupRow } from './GroupRow'
import { HubView } from './HubView'
import { NodesView } from './NodesView'
import { useSettings } from './SettingsContext'
import { TailscaleView } from './TailscaleView'

type SettingsView =
  | 'list'
  | 'nodes'
  | 'general'
  | 'alerts'
  | 'display'
  | 'connectivity'
  | 'cellular'
  | 'hub'
  | 'tailscale'
type SubView = Exclude<SettingsView, 'list'>

const PANEL = 'border-border bg-surface overflow-hidden rounded-2xl border'

const VIEWS: Record<SubView, { title: string; parent: SettingsView; content: ReactNode }> = {
  nodes: { title: 'Nodes', parent: 'list', content: <NodesView /> },
  general: { title: 'General', parent: 'list', content: null },
  alerts: { title: 'Alerts', parent: 'general', content: <AlertsView /> },
  display: { title: 'Display', parent: 'general', content: <DisplayView /> },
  connectivity: { title: 'Connectivity', parent: 'list', content: null },
  cellular: { title: 'Cellular', parent: 'connectivity', content: <CellularView /> },
  hub: { title: 'Hub', parent: 'connectivity', content: <HubView /> },
  tailscale: { title: 'Tailscale', parent: 'connectivity', content: <TailscaleView /> },
}

/** `list → … → view`, root excluded, outermost first. */
function trailTo(view: SubView): SubView[] {
  const trail: SubView[] = []
  for (let v: SettingsView = view; v !== 'list'; v = VIEWS[v].parent) trail.unshift(v)
  return trail
}

/**
 * Settings as a drill-down tree, subpage style: the top list, or one group's
 * page under a breadcrumb trail. Memoised: it takes no props and only
 * re-renders when the Settings context value changes.
 */
export const SettingsTab = memo(function SettingsTab() {
  const { nodes } = useSettings()
  const [view, setView] = useState<SettingsView>('list')

  return (
    <section
      aria-label="Settings"
      data-testid="pane-settings"
      className="flex min-h-0 flex-1 flex-col"
    >
      <ScrollShadow hideScrollBar className="min-h-0 flex-1">
        <div className="flex w-full max-w-xl min-w-0 flex-col gap-3 p-4">
          {view === 'list' ? (
            <>
              <h1 className="px-1 text-base font-medium">Settings</h1>
              <div className={`${PANEL} divide-border divide-y`}>
                <GroupRow
                  label="Nodes"
                  description={nodesSummary(nodes)}
                  onOpen={() => setView('nodes')}
                />
                <GroupRow
                  label="General"
                  description="Alerts, display"
                  onOpen={() => setView('general')}
                />
                <GroupRow
                  label="Connectivity"
                  description="Cellular, Hub, Tailscale"
                  onOpen={() => setView('connectivity')}
                />
              </div>
            </>
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
              {view === 'general' ? (
                <GeneralView onOpen={setView} />
              ) : view === 'connectivity' ? (
                <ConnectivityView onOpen={setView} />
              ) : (
                VIEWS[view].content
              )}
            </>
          )}
        </div>
      </ScrollShadow>
    </section>
  )
})
