import { memo, useCallback, useState, type ReactNode } from 'react'
import { Button, Drawer, ScrollShadow } from '@heroui/react'
import { ArrowLeft, Workflow, SlidersHorizontal, Van, Wifi } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'
import { useUrlParam } from '@/hooks/useUrlParam'
import { useContentStable } from '@/hooks/useStable'
import { useSettingsNavStyle, type SettingsNavStyle } from '@/hooks/useSettingsNavStyle'
import { driversSummary } from '@/lib/drivers'
import { pushSearchParams } from '@/lib/urlHistory'
import { routerDriver, routerName } from '@/lib/routerDriver'
import { FLUID_LABELS } from '@/lib/tank-labels'
import { AlertsView } from './general/preferences/AlertsView'
import { AlertsButton } from '@/components/AlertsButton'
import { UplinkStatusButton } from '@/components/UplinkStatusButton'
import { DisplaySleepButton } from '@/components/DisplaySleepButton'
import { CellularView } from './connectivity/CellularView'
import { ConnectivityView } from './connectivity/ConnectivityView'
import { DisplayView } from './general/preferences/DisplayView'
import { AboutView } from './general/system/AboutView'
import { FirmwareView } from './general/system/FirmwareView'
import { GeneralView } from './general/GeneralView'
import { Group } from './shared/Group'
import { GroupRow } from './shared/GroupRow'
import { HubView } from './connectivity/HubView'
import { DriverInfoView } from './drivers/DriverInfoView'
import { DriverView } from './drivers/DriverView'
import { DriversView } from './drivers/DriversView'
import { START_WIDGETS } from '@/components/start/widgets/registry'
import { START_WIDGET_IDS, type StartWidgetId } from '@/hooks/useStartLayout'
import { StartPageView } from './general/preferences/StartPageView'
import { WidgetsView } from './general/preferences/WidgetsView'
import { WidgetView } from './general/preferences/WidgetView'
import { PowerPageView } from './general/preferences/PowerPageView'
import { MapPageView } from './general/preferences/MapPageView'
import { useSettingsData, useSettingsPreferences, useSettingsActions } from './SettingsContext'
import { VanView } from './advanced/VanView'
import { TailscaleView } from './connectivity/TailscaleView'
import { TankSettingsView } from './drivers/TankSettingsView'
import { TanksView } from './drivers/TanksView'
import { useReportedTankIds } from './drivers/useReportedTankIds'
import { RelaysView } from './drivers/RelaysView'
import { TemperatureView } from './drivers/TemperatureView'
import { GpsView } from './drivers/GpsView'
import { InstancesView } from './drivers/InstancesView'
import type { SettingsSubView, SettingsView } from './views'
import { SettingsNavBar } from './SettingsNavBar'
import { useHideShellHeader } from './ShellHeaderContext'

const VIEWS: Record<SettingsSubView, { title: string; parent: SettingsView }> = {
  drivers: { title: 'Devices', parent: 'list' },
  driver: { title: 'Driver', parent: 'drivers' },
  'driver-info': { title: 'Driver', parent: 'driver' },
  tanks: { title: 'Tanks', parent: 'drivers' },
  tank: { title: 'Tank', parent: 'tanks' },
  temperature: { title: 'Temperature', parent: 'drivers' },
  gps: { title: 'GPS', parent: 'drivers' },
  relays: { title: 'Relays', parent: 'drivers' },
  batteries: { title: 'Batteries', parent: 'drivers' },
  solar: { title: 'Solar', parent: 'drivers' },
  chargers: { title: 'Chargers', parent: 'drivers' },
  general: { title: 'General', parent: 'list' },
  firmware: { title: 'Firmware', parent: 'general' },
  about: { title: 'About', parent: 'general' },
  alerts: { title: 'Alerts', parent: 'general' },
  display: { title: 'Display & Appearance', parent: 'general' },
  widgets: { title: 'Widgets', parent: 'display' },
  widget: { title: 'Widget', parent: 'widgets' },
  'start-page': { title: 'Start page', parent: 'display' },
  'power-page': { title: 'Power page', parent: 'display' },
  'map-page': { title: 'Map page', parent: 'display' },
  connectivity: { title: 'Connectivity', parent: 'list' },
  cellular: { title: 'Cellular', parent: 'connectivity' },
  hub: { title: 'Hub', parent: 'connectivity' },
  tailscale: { title: 'Tailscale', parent: 'connectivity' },
  van: { title: 'Van', parent: 'list' },
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
    drivers,
    tanks,
    displayPower,
    router,
    routerHealth,
    routerUpdatedAt,
    busStatus,
    tailscale,
    hub,
    unseenAlertCount,
  } = useSettingsData()
  const { navbarPosition, startPowerSources, startLayout, powerLayout, mapTheme, van } =
    useSettingsPreferences()
  const {
    sleepDisplay,
    wakeDisplay,
    openAlerts,
    setNavbarPosition,
    setStartPowerSources,
    setStartLayout,
    setPowerLayout,
    setMapTheme,
    setVanField,
  } = useSettingsActions()
  const isMobile = useIsMobile()
  const [storedNavStyle, setStoredNavStyle] = useSettingsNavStyle()
  // Derived at render and never written: the stored kiosk choice survives a phone visit.
  const navStyle: SettingsNavStyle = isMobile ? 'subpage' : storedNavStyle
  // The open view lives in `?view=`; no param (or an unknown one) is the top list.
  const [viewParam, setViewParam] = useUrlParam('view', SUB_VIEWS)
  // The open tank lives in `?tank=`, valid only while it names a reported tank.
  const tankIds = useReportedTankIds()
  // `useUrlParam` needs a stable list: keep the array while the set of tanks is unchanged.
  const validTankIds = useContentStable(tankIds)
  const [tankParam] = useUrlParam('tank', validTankIds)
  // The open Driver lives in `?driver=`, valid only while it names a reported Driver or a fallback row.
  const validDriverKeys = useContentStable(drivers.map((row) => row.key))
  const [driverParam] = useUrlParam('driver', validDriverKeys)
  const driverRow = drivers.find((row) => row.key === driverParam)
  // The open widget lives in `?widget=`, valid only while it names a Start page widget.
  const [widgetParam] = useUrlParam('widget', START_WIDGET_IDS)
  // A tank view without a reported tank has nothing to show: fall back to the tank list; a driver
  // view without a reported Driver, to the Drivers list; a widget view without a widget, to Widgets.
  const view: SettingsView =
    viewParam === 'widget' && widgetParam === null
      ? 'widgets'
      : viewParam === 'tank' && tankParam === null
        ? 'tanks'
        : (viewParam === 'driver' || viewParam === 'driver-info') && driverRow === undefined
          ? 'drivers'
          : (viewParam ?? 'list')
  // `tank` is titled by the open tank's fluid and `driver` by the open Driver's label; every other
  // view has a fixed title.
  const titleOf = (id: SettingsSubView): string => {
    const fluid = tankParam === null ? undefined : tanks[tankParam]?.fluid_type
    if (id === 'tank' && fluid) return FLUID_LABELS[fluid]
    if (id === 'driver' && driverRow) return driverRow.name
    if (id === 'widget' && widgetParam) return START_WIDGETS[widgetParam].label
    if (id === 'cellular') return routerName(routerDriver(drivers))
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
  // Likewise `view` and `widget`.
  const openWidget = useCallback((id: StartWidgetId) => {
    const params = new URLSearchParams(window.location.search)
    params.set('view', 'widget')
    params.set('widget', id)
    pushSearchParams(params)
  }, [])
  // Likewise `view` and `driver`.
  const openDriver = useCallback((driverKey: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('view', 'driver')
    params.set('driver', driverKey)
    pushSearchParams(params)
  }, [])

  const content = (id: SettingsSubView): ReactNode => {
    switch (id) {
      case 'drivers':
        return <DriversView onOpen={openDriver} />
      case 'driver':
        return driverRow === undefined ? null : <DriverView row={driverRow} onOpen={setView} />
      case 'driver-info':
        return driverRow === undefined ? null : <DriverInfoView row={driverRow} />
      case 'tanks':
        return <TanksView onOpen={openTank} />
      case 'tank':
        return <TankSettingsView />
      case 'temperature':
        return <TemperatureView />
      case 'gps':
        return <GpsView />
      case 'relays':
        return <RelaysView />
      case 'batteries':
        return <InstancesView type="battery" />
      case 'solar':
        return <InstancesView type="solar" />
      case 'chargers':
        return <InstancesView type="charger" />
      case 'general':
        return <GeneralView onOpen={setView} />
      case 'firmware':
        return <FirmwareView />
      case 'about':
        return <AboutView />
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
      case 'widgets':
        return <WidgetsView layout={startLayout} onChange={setStartLayout} onOpen={openWidget} />
      case 'widget':
        return widgetParam === null ? null : (
          <WidgetView id={widgetParam} layout={startLayout} onChange={setStartLayout} />
        )
      case 'start-page':
        return <StartPageView sources={startPowerSources} onChange={setStartPowerSources} />
      case 'power-page':
        return <PowerPageView layout={powerLayout} onChange={setPowerLayout} />
      case 'map-page':
        return <MapPageView theme={mapTheme} onChange={setMapTheme} />
      case 'connectivity':
        return <ConnectivityView onOpen={setView} />
      case 'cellular':
        return <CellularView />
      case 'hub':
        return <HubView />
      case 'tailscale':
        return <TailscaleView />
      case 'van':
        return <VanView van={van} onChange={setVanField} />
    }
  }

  const topList = (
    <>
      <h1 className="px-1 text-base font-medium">Settings</h1>
      <div className="flex flex-col gap-2">
        <GroupRow
          icon={<Workflow />}
          label="Devices"
          description={driversSummary(drivers)}
          onOpen={() => setView('drivers')}
        />
        <Group title="Hub">
          <GroupRow
            icon={<SlidersHorizontal />}
            label="General"
            description="Firmware, display, alerts"
            onOpen={() => setView('general')}
          />
          <GroupRow
            icon={<Wifi />}
            label="Connectivity"
            description={`${routerName(routerDriver(drivers))}, Hub, Tailscale`}
            onOpen={() => setView('connectivity')}
          />
        </Group>
        <Group title="Advanced">
          <GroupRow
            icon={<Van />}
            label="Van"
            description="Vehicle information"
            onOpen={() => setView('van')}
          />
        </Group>
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
        <SettingsNavBar
          title={titleOf(subpage)}
          parentTitle={
            VIEWS[subpage].parent === 'list' ? 'Settings' : titleOf(VIEWS[subpage].parent)
          }
          onBack={() => setView(VIEWS[subpage].parent)}
          action={
            <div className="flex items-center gap-1.5">
              {/* On a phone the bar carries the sleep button alone: the menu drawer and the status
                  controls are the app header's, which this bar replaces, and they come back with it. */}
              {!isMobile && (
                <>
                  <UplinkStatusButton
                    router={router}
                    routerHealth={routerHealth}
                    lastReceivedAt={routerUpdatedAt}
                    tailscale={tailscale}
                    busStatus={busStatus}
                    hub={hub}
                    onOpenSettings={() => setView('connectivity')}
                  />
                  <AlertsButton onClick={openAlerts} count={unseenAlertCount} active={false} />
                </>
              )}
              <DisplaySleepButton
                displayPower={displayPower}
                onSleep={sleepDisplay}
                onWake={wakeDisplay}
              />
            </div>
          }
        />
      )}
      {/* Keyed per screen: HeroUI's scroll-driven fade keeps the previous scroller's fully-applied
          start fade when the same element stops overflowing (Chromium leaves the start animation
          `running` at progress 1), so a short driver view inherits the list's top shadow. A fresh
          element starts with an inactive timeline and no fade. */}
      <ScrollShadow
        key={`${view}:${driverParam ?? ''}:${tankParam ?? ''}`}
        hideScrollBar
        className="min-h-0 flex-1"
      >
        {/* The top gap is padding inside the scroller, so it scrolls away with the content and the
            content slides flush under the bar; a margin outside would clip it 12px below the bar. */}
        <div
          className={cn(
            'flex w-full min-w-0 flex-col gap-3',
            (subpage !== null || isMobile) && 'pt-3',
          )}
        >
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
