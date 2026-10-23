import { memo, useCallback, useMemo, useState, type ReactNode } from 'react'
import { Button, Drawer, ScrollShadow, Separator } from '@heroui/react'
import { ArrowLeft, Workflow, SlidersHorizontal, Wifi } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-media-query'
import { useUrlParam } from '@/hooks/useUrlParam'
import { useSettingsNavStyle, type SettingsNavStyle } from '@/hooks/useSettingsNavStyle'
import { devicesSummary } from '@/lib/devices'
import { pushSearchParams } from '@/lib/urlHistory'
import { routerDevice, routerName } from '@/lib/routerDevice'
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
import { GroupRow } from './shared/GroupRow'
import { HubView } from './connectivity/HubView'
import { DeviceInfoView } from './devices/DeviceInfoView'
import { DeviceView } from './devices/DeviceView'
import { DevicesView } from './devices/DevicesView'
import { StartPageView } from './general/preferences/StartPageView'
import { PowerPageView } from './general/preferences/PowerPageView'
import { MapPageView } from './general/preferences/MapPageView'
import { useSettings } from './SettingsContext'
import { TailscaleView } from './connectivity/TailscaleView'
import { TankSettingsView } from './devices/TankSettingsView'
import { TanksView } from './devices/TanksView'
import { useReportedTankIds } from './devices/useReportedTankIds'
import { RelaysView } from './devices/RelaysView'
import { TemperatureView } from './devices/TemperatureView'
import type { SettingsSubView, SettingsView } from './views'
import { SettingsNavBar } from './SettingsNavBar'
import { useHideShellHeader } from './ShellHeaderContext'

const VIEWS: Record<SettingsSubView, { title: string; parent: SettingsView }> = {
  devices: { title: 'Devices', parent: 'list' },
  device: { title: 'Device', parent: 'devices' },
  'device-info': { title: 'Device', parent: 'device' },
  tanks: { title: 'Tanks', parent: 'devices' },
  tank: { title: 'Tank', parent: 'tanks' },
  temperature: { title: 'Temperature', parent: 'devices' },
  relays: { title: 'Relays', parent: 'devices' },
  general: { title: 'General', parent: 'list' },
  firmware: { title: 'Firmware', parent: 'general' },
  about: { title: 'About', parent: 'general' },
  alerts: { title: 'Alerts', parent: 'general' },
  display: { title: 'Display & Appearance', parent: 'general' },
  'start-page': { title: 'Start page', parent: 'display' },
  'power-page': { title: 'Power page', parent: 'display' },
  'map-page': { title: 'Map page', parent: 'display' },
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
    devices,
    tanks,
    displayPower,
    router,
    routerHealth,
    routerUpdatedAt,
    busStatus,
    tailscale,
    hub,
    sleepDisplay,
    wakeDisplay,
    unseenAlertCount,
    openAlerts,
    navbarPosition,
    setNavbarPosition,
    startPowerSources,
    setStartPowerSources,
    powerLayout,
    setPowerLayout,
    mapTheme,
    setMapTheme,
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
  // The open Device lives in `?device=`, valid only while it names a reported Device or a fallback row.
  const deviceKeys = devices.map((row) => row.key)
  const deviceKeysKey = deviceKeys.join('\u0000')
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by content
  const validDeviceKeys = useMemo(() => deviceKeys, [deviceKeysKey])
  const [deviceParam] = useUrlParam('device', validDeviceKeys)
  const deviceRow = devices.find((row) => row.key === deviceParam)
  // A tank view without a reported tank has nothing to show: fall back to the tank list; a device
  // view without a reported Device, to the Devices list.
  const view: SettingsView =
    viewParam === 'tank' && tankParam === null
      ? 'tanks'
      : (viewParam === 'device' || viewParam === 'device-info') && deviceRow === undefined
        ? 'devices'
        : (viewParam ?? 'list')
  // `tank` is titled by the open tank's fluid and `device` by the open Device's label; every other
  // view has a fixed title.
  const titleOf = (id: SettingsSubView): string => {
    const fluid = tankParam === null ? undefined : tanks[tankParam]?.fluid_type
    if (id === 'tank' && fluid) return FLUID_LABELS[fluid]
    if (id === 'device' && deviceRow) return deviceRow.name
    if (id === 'cellular') return routerName(routerDevice(devices))
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
  // Likewise `view` and `device`.
  const openDevice = useCallback((deviceKey: string) => {
    const params = new URLSearchParams(window.location.search)
    params.set('view', 'device')
    params.set('device', deviceKey)
    pushSearchParams(params)
  }, [])

  const content = (id: SettingsSubView): ReactNode => {
    switch (id) {
      case 'devices':
        return <DevicesView onOpen={openDevice} />
      case 'device':
        return deviceRow === undefined ? null : <DeviceView row={deviceRow} onOpen={setView} />
      case 'device-info':
        return deviceRow === undefined ? null : <DeviceInfoView row={deviceRow} />
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
    }
  }

  const topList = (
    <>
      <h1 className="px-1 text-base font-medium">Settings</h1>
      <div className="flex flex-col gap-2">
        <GroupRow
          icon={<Workflow />}
          label="Devices"
          description={devicesSummary(devices)}
          onOpen={() => setView('devices')}
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
          description={`${routerName(routerDevice(devices))}, Hub, Tailscale`}
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
        <SettingsNavBar
          title={titleOf(subpage)}
          parentTitle={
            VIEWS[subpage].parent === 'list' ? 'Settings' : titleOf(VIEWS[subpage].parent)
          }
          onBack={() => setView(VIEWS[subpage].parent)}
          action={
            <div className="flex items-center gap-1.5">
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
          `running` at progress 1), so a short device view inherits the list's top shadow. A fresh
          element starts with an inactive timeline and no fade. */}
      <ScrollShadow
        key={`${view}:${deviceParam ?? ''}:${tankParam ?? ''}`}
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
