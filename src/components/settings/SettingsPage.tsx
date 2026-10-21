import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'
import { Button, Drawer, ScrollShadow, Separator } from '@heroui/react'
import { ArrowLeft, Workflow, SlidersHorizontal, Wifi } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useUrlParam } from '@/hooks/useUrlParam'
import { useSettingsNavStyle, type SettingsNavStyle } from '@/hooks/useSettingsNavStyle'
import { nodesSummary } from '@/lib/nodes'
import { pushSearchParams } from '@/lib/urlHistory'
import { FLUID_LABELS } from '@/lib/tank-labels'
import { AlertsView } from './general/preferences/AlertsView'
import { CellularView } from './connectivity/CellularView'
import { ConnectivityView } from './connectivity/ConnectivityView'
import { DisplayView } from './general/preferences/DisplayView'
import { FirmwareView } from './general/system/FirmwareView'
import { GeneralView } from './general/GeneralView'
import { GroupRow } from './shared/GroupRow'
import { HubView } from './connectivity/HubView'
import { DeviceView } from './nodes/DeviceView'
import { NodeView } from './nodes/NodeView'
import { NodesView } from './nodes/NodesView'
import { StartPageView } from './general/preferences/StartPageView'
import { PowerPageView } from './general/preferences/PowerPageView'
import { useSettings } from './SettingsContext'
import { TailscaleView } from './connectivity/TailscaleView'
import { TankSettingsView } from './nodes/TankSettingsView'
import { TanksView } from './nodes/TanksView'
import { useReportedTankIds } from './nodes/useReportedTankIds'
import { RelaysView } from './nodes/RelaysView'
import { TemperatureView } from './nodes/TemperatureView'
import type { SettingsSubView, SettingsView } from './views'
import { SettingsNavBar } from './SettingsNavBar'
import { useHideShellHeader } from './ShellHeaderContext'

const VIEWS: Record<SettingsSubView, { title: string; parent: SettingsView }> = {
  nodes: { title: 'Nodes', parent: 'list' },
  node: { title: 'Node', parent: 'nodes' },
  device: { title: 'Device', parent: 'node' },
  tanks: { title: 'Tanks', parent: 'nodes' },
  tank: { title: 'Tank', parent: 'tanks' },
  temperature: { title: 'Temperature', parent: 'nodes' },
  relays: { title: 'Relays', parent: 'nodes' },
  general: { title: 'General', parent: 'list' },
  firmware: { title: 'Firmware', parent: 'general' },
  alerts: { title: 'Alerts', parent: 'general' },
  display: { title: 'Display & Appearance', parent: 'general' },
  'start-page': { title: 'Start page', parent: 'display' },
  'power-page': { title: 'Power page', parent: 'display' },
  connectivity: { title: 'Connectivity', parent: 'list' },
  cellular: { title: 'Cellular', parent: 'connectivity' },
  hub: { title: 'Hub', parent: 'connectivity' },
  tailscale: { title: 'Tailscale', parent: 'connectivity' },
}

const SUB_VIEWS = Object.keys(VIEWS) as SettingsSubView[]

/**
 * Settings as a drill-down tree: the top list, then one group's view per
 * level. The Navigation style (a toggle in Display & Appearance) opens a view either as a subpage
 * (the view replaces the page, and its navigation bar replaces the app header: a back button
 * named for the parent view, and the view's title) or as a drawer (the top list stays and the
 * view slides in from the right). Memoised: it takes no props and only re-renders when the
 * Settings context value changes.
 */
export const SettingsPage = memo(function SettingsPage() {
  const {
    nodes,
    tanks,
    navbarPosition,
    setNavbarPosition,
    startPowerSources,
    setStartPowerSources,
    powerLayout,
    setPowerLayout,
  } = useSettings()
  const isMobile = useIsMobile()
  const [storedNavStyle, setStoredNavStyle] = useSettingsNavStyle()
  // Derived at render and never written: the stored kiosk choice survives a phone visit.
  const navStyle: SettingsNavStyle = isMobile ? 'subpage' : storedNavStyle
  // The open view lives in `?view=`; no param (or an unknown one) is the top list.
  const [viewParam, setViewParam] = useUrlParam('view', SUB_VIEWS)
  // The open tank lives in `?tank=`, valid only while it names a reported tank.
  const tankIds = useReportedTankIds()
  // `useUrlParam` needs a stable list: keep the array while the set of tanks is unchanged.
  const tankIdsKey = tankIds.join('\u0000')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content
  const validTankIds = useMemo(() => tankIds, [tankIdsKey])
  const [tankParam] = useUrlParam('tank', validTankIds)
  // The open Node lives in `?node=`, valid only while it names a reported Node or a fallback row.
  const nodeKeys = nodes.map((row) => row.key)
  const nodeKeysKey = nodeKeys.join('\u0000')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content
  const validNodeKeys = useMemo(() => nodeKeys, [nodeKeysKey])
  const [nodeParam] = useUrlParam('node', validNodeKeys)
  const nodeRow = nodes.find((row) => row.key === nodeParam)
  // A tank view without a reported tank has nothing to show: fall back to the tank list; a node
  // view without a reported Node, to the Nodes list.
  const view: SettingsView =
    viewParam === 'tank' && tankParam === null
      ? 'tanks'
      : (viewParam === 'node' || viewParam === 'device') && nodeRow === undefined
        ? 'nodes'
        : (viewParam ?? 'list')
  // `tank` is titled by the open tank's fluid and `node` by the open Node's label; every other
  // view has a fixed title.
  const titleOf = (id: SettingsSubView): string => {
    const fluid = tankParam === null ? undefined : tanks[tankParam]?.fluid_type
    if (id === 'tank' && fluid) return FLUID_LABELS[fluid]
    if (id === 'node' && nodeRow) return nodeRow.name
    return VIEWS[id].title
  }
  // The drawer is one persistent dialog: navigating deeper swaps its content in place instead
  // of closing one drawer and opening another. Remember the last open view so the content
  // stays put while the drawer slides out after the final close.
  const [lastOpenView, setLastOpenView] = useState<SettingsSubView | null>(null)
  if (view !== 'list' && view !== lastOpenView) setLastOpenView(view)
  const drawerView = view === 'list' ? lastOpenView : view
  const setView = useCallback(
    (next: SettingsView) => setViewParam(next === 'list' ? null : next),
    [setViewParam],
  )
  // `view` and `tank` change together, in one history entry.
  const openTank = useCallback((tankId: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('view', 'tank')
    params.set('tank', tankId)
    pushSearchParams(params)
  }, [])
  // Likewise `view` and `node`.
  const openNode = useCallback((nodeKey: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('view', 'node')
    params.set('node', nodeKey)
    pushSearchParams(params)
  }, [])

  const content = (id: SettingsSubView): ReactNode => {
    switch (id) {
      case 'nodes':
        return <NodesView onOpen={openNode} />
      case 'node':
        return nodeRow === undefined ? null : <NodeView row={nodeRow} onOpen={setView} />
      case 'device':
        return nodeRow === undefined ? null : <DeviceView row={nodeRow} />
      case 'tanks':
        return <TanksView onOpen={openTank} />
      case 'tank':
        return <TankSettingsView />
      case 'temperature':
        return <TemperatureView />
      case 'relays':
        return <RelaysView />
      case 'general':
        return <GeneralView onOpen={setView} />
      case 'firmware':
        return <FirmwareView />
      case 'alerts':
        return <AlertsView />
      case 'display':
        return (
          <DisplayView
            navStyle={navStyle}
            onNavStyleChange={setStoredNavStyle}
            navbarPosition={isMobile ? 'bottom' : navbarPosition}
            onNavbarPositionChange={setNavbarPosition}
            isMobile={isMobile}
            onOpen={setView}
          />
        )
      case 'start-page':
        return <StartPageView sources={startPowerSources} onChange={setStartPowerSources} />
      case 'power-page':
        return <PowerPageView layout={powerLayout} onChange={setPowerLayout} />
      case 'connectivity':
        return <ConnectivityView onOpen={setView} />
      case 'cellular':
        return <CellularView />
      case 'hub':
        return <HubView />
      case 'tailscale':
        return <TailscaleView />
    }
  }

  const topList = (
    <>
      <h1 className="px-1 text-base font-medium">Settings</h1>
      <div className="flex flex-col gap-2">
        <GroupRow
          icon={<Workflow />}
          label="Nodes"
          description={nodesSummary(nodes)}
          onOpen={() => setView('nodes')}
        />
        <Separator className="my-1" />
        <GroupRow
          icon={<SlidersHorizontal />}
          label="General"
          description="Firmware, display, alerts"
          onOpen={() => setView('general')}
        />
        <GroupRow
          icon={<Wifi />}
          label="Connectivity"
          description="Cellular, Hub, Tailscale"
          onOpen={() => setView('connectivity')}
        />
      </div>
    </>
  )

  // A subpage replaces the app header with its own bar; the drawer and the top list keep it.
  const subpage = navStyle === 'subpage' && view !== 'list' ? view : null
  useHideShellHeader(subpage !== null)

  return (
    <section
      aria-label="Settings"
      data-testid="pane-settings"
      className="flex min-h-0 flex-1 flex-col px-4 pb-4"
    >
      {subpage !== null && (
        <div className="shrink-0 py-2">
          <SettingsNavBar
            title={titleOf(subpage)}
            parentTitle={
              VIEWS[subpage].parent === 'list' ? 'Settings' : titleOf(VIEWS[subpage].parent)
            }
            onBack={() => setView(VIEWS[subpage].parent)}
          />
        </div>
      )}
      {/* Keyed per screen: HeroUI's scroll-driven fade keeps the previous scroller's fully-applied
          start fade when the same element stops overflowing (Chromium leaves the start animation
          `running` at progress 1), so a short node view inherits the list's top shadow. A fresh
          element starts with an inactive timeline and no fade. */}
      <ScrollShadow
        key={`${view}:${nodeParam ?? ''}:${tankParam ?? ''}`}
        hideScrollBar
        className="min-h-0 flex-1"
      >
        <div className="flex w-full min-w-0 flex-col gap-3">
          {subpage === null ? topList : content(subpage)}
        </div>
      </ScrollShadow>
      {navStyle === 'drawer' && drawerView !== null && (
        // No `Drawer` root: it wraps a React Aria `DialogTrigger`, which warns when nothing
        // pressable registers; the controlled backdrop needs no trigger.
        <Drawer.Backdrop
          variant="opaque"
          isOpen={view !== 'list'}
          // Closing (Escape, close control, backdrop) closes the whole drawer; only the back
          // arrow steps up one level.
          onOpenChange={(open) => {
            if (!open) setView('list')
          }}
        >
          <Drawer.Content placement="right">
            {/* Unlayered HeroUI CSS sets an opaque `bg-overlay`, so the frosted panel needs `!`. */}
            <Drawer.Dialog className="bg-overlay/60! backdrop-blur-sm!">
              <Drawer.Header>
                <div className="flex items-center gap-2">
                  <Button
                    isIconOnly
                    variant="ghost"
                    aria-label="Back"
                    onPress={() => setView(VIEWS[drawerView].parent)}
                  >
                    <ArrowLeft aria-hidden="true" />
                  </Button>
                  <Drawer.Heading className="min-w-0 flex-1 truncate">
                    {titleOf(drawerView)}
                  </Drawer.Heading>
                  {/* HeroUI pins the close trigger to the corner (`absolute`); in the row it flows. */}
                  <Drawer.CloseTrigger className="static!" />
                </div>
              </Drawer.Header>
              {/* All view content stays in the body: a Slider outside it can start a drag-to-dismiss. */}
              <Drawer.Body>{content(drawerView)}</Drawer.Body>
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      )}
    </section>
  )
})
