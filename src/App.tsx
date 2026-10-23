import {
  lazy,
  Suspense,
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Gauge, Droplet, Wrench, ToggleLeft, Zap, Heater, Map } from 'lucide-react'
import { Separator, Tabs } from '@heroui/react'
import lockupLight from '../assets/logo/svg/renewvan-lockup-light.svg'
import lockupDark from '../assets/logo/svg/renewvan-lockup-dark.svg'
import { cn } from '@/lib/utils'
import { Clock } from '@/components/Clock'
import { DisplaySleepButton } from '@/components/DisplaySleepButton'
import { AlertsButton } from '@/components/AlertsButton'
import { UplinkStatusButton } from '@/components/UplinkStatusButton'
import { Sidebar, type NavItem } from '@/components/Sidebar'
import { StubPane } from '@/components/StubPane'
import { AlertsPage } from '@/components/alerts/AlertsPage'
import { SettingsProvider } from '@/components/settings/SettingsProvider'
import { SettingsPage } from '@/components/settings/SettingsPage'
import type { SettingsSubView } from '@/components/settings/views'
import { TanksPage } from '@/components/tanks/TanksPage'
import { RelaysPage } from '@/components/relays/RelaysPage'
import { StartPage } from '@/components/start/StartPage'
import { PowerPage } from '@/components/power/PowerPage'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { useAlertToasts } from '@/hooks/useAlertToasts'
import { useAlertHistory } from '@/hooks/useAlertHistory'
import { useAlertsEnabled } from '@/hooks/useAlertsEnabled'
import { useIsMobile } from '@/hooks/use-media-query'
import { useUnseenAlertCount } from '@/hooks/useUnseenAlertCount'
import { useRenewvanBus } from '@/hooks/useRenewvanBus'
import { deviceRows, relayDevicesOnline, tiltDevicesOffline } from '@/lib/devices'
import type { RenewvanBusState } from '@/types'
import { settingsCommands } from '@/lib/settings-commands'
import { useAutoHide } from '@/hooks/useAutoHide'
import { useTheme } from '@/hooks/useTheme'
import { BottomNavBar } from '@/components/BottomNavBar'
import { useNavbarPosition } from '@/hooks/useNavbarPosition'
import { useStartPowerSources } from '@/hooks/useStartPowerSources'
import { usePowerLayout } from '@/hooks/usePowerLayout'
import { resolveMapIsDark, useMapTheme } from '@/hooks/useMapTheme'
import { useVan } from '@/hooks/useVan'
import { useUrlPage } from '@/hooks/useUrlPage'
import { useHubAddress } from '@/hooks/useHubAddress'
import { useBrokerLink } from '@/hooks/useBrokerLink'
import { ShellHeaderContext } from '@/components/settings/ShellHeaderContext'

// MapLibre is most of the bundle and only the Map page uses it, so that page loads on first visit
// instead of with every other page. `MapPage` is a named export, which `lazy` needs as a default.
const MapPage = lazy(() => import('@/components/map/MapPage').then((m) => ({ default: m.MapPage })))

/** What the Map pane shows for the moment its chunk loads: the same quiet pane as "no fix yet". */
function MapLoading() {
  return (
    <section
      data-testid="pane-map-loading"
      aria-busy="true"
      className="flex min-h-0 flex-1 items-center justify-center"
    >
      <span className="text-muted text-sm">Loading map…</span>
    </section>
  )
}

/** No tilt record at all, one stable object so the pages' `tilt` prop does not change every render. */
const NO_TILT: RenewvanBusState['tilt'] = {}

const NAV_ITEMS: NavItem[] = [
  { id: 'start', label: 'Start', icon: <Gauge className="size-5" /> },
  { id: 'power', label: 'Power', icon: <Zap className="size-5" /> },
  { id: 'tanks', label: 'Tanks', icon: <Droplet className="size-5" /> },
  { id: 'map', label: 'Map', icon: <Map className="size-5" /> },
  { id: 'switches', label: 'Relays', icon: <ToggleLeft className="size-5" /> },
  { id: 'heater', label: 'Heater', icon: <Heater className="size-5" /> },
  { id: 'settings', label: 'Settings', icon: <Wrench className="size-5" /> },
]

// Reachable via the header's `AlertsButton` + `?page=alerts` deep link
// only — deliberately excluded from `NAV_ITEMS`/`Sidebar` per explicit
// request, so `useUrlPage` needs its own superset of valid ids.
const PAGE_IDS = [...NAV_ITEMS.map((item) => item.id), 'alerts']

/** Custom property the header publishes on `<html>` so the toast region (portaled to `<body>`, see `main.tsx`) can sit below it. */
const HEADER_HEIGHT_VAR = '--app-header-height'

// HeroUI's component CSS is unlayered, so utilities need `!` to override its spacing; the shell sizes panes itself.
// Every panel pads its navbar edge by the inset the `Tabs` root publishes (below), so no page, built
// or not, runs under the navbar while it is up, and all of them stretch into the space as it slides
// away.
const PANEL_CLASS =
  'm-0! flex min-h-0 min-w-0 flex-1 flex-col p-0! pb-(--navbar-inset-bottom)! pl-(--navbar-inset-left)!'

// The kiosk navbar floats over the panes and never pushes them. The `Tabs` root publishes how much
// of the pane's edge it currently covers as `--navbar-inset-bottom` / `--navbar-inset-left` (0
// while it is slid away or on the other side). The rail is 56px wide; the bar is one 56px touch
// target (an icon over its label; docs/design-principles.md asks for 44px) plus its 1px border,
// plus the safe-area inset.
const RAIL_INSET = '56px'
const BAR_INSET = 'calc(57px + env(safe-area-inset-bottom))'

/** The header's sleep/wake command. Its payload is a bare `on`/`off`, not JSON, so it is not one
 * of the settings commands (`lib/settings-commands.ts`). */
const TOPIC_DISPLAY_POWER_SET = 'renewvan/kiosk/display/power/set'

function App() {
  const {
    state,
    status,
    displayPower,
    brightness,
    autoSleepEnabled,
    autoSleepTimeoutMinutes,
    tailscale,
    hubStatus,
    routerHealth,
    demoMode,
    setDemoMode,
    publish,
  } = useRenewvanBus()
  const [alertsEnabled, setAlertsEnabled] = useAlertsEnabled()
  const alertHistory = useAlertHistory()
  const hub = useHubAddress(hubStatus)
  const broker = useBrokerLink()
  useAlertToasts({ tanks: state.tanks, status, tailscale, enabled: alertsEnabled, demo: demoMode })
  const [activePage, setActivePage] = useUrlPage(PAGE_IDS, 'start')
  // A view (and the tank it shows) belongs to the Settings page: any other page change leaves
  // both behind (one entry).
  const goToPage = (id: string) => setActivePage(id, { view: null, tank: null })
  // One history entry for page and view together, so Back returns to the previous page.
  const openSettings = (view: SettingsSubView) => setActivePage('settings', { view, tank: null })
  // The tank's Configure button: Settings › Devices › Tanks › <tank>, page, view and tank in one entry.
  const openTankSettings = (tankId: string) =>
    setActivePage('settings', { view: 'tank', tank: tankId })
  const unseenAlertCount = useUnseenAlertCount(activePage)
  const [theme, setTheme] = useTheme()
  const isMobile = useIsMobile()
  const [navbarPosition, setNavbarPosition] = useNavbarPosition()
  const [startPowerSources, setStartPowerSources] = useStartPowerSources()
  const [powerLayout, setPowerLayout] = usePowerLayout()
  const [mapTheme, setMapTheme] = useMapTheme()
  const [van, setVanField] = useVan()
  // Derived at render and never written: the stored kiosk choice survives a phone visit.
  const isBottomBar = !isMobile && navbarPosition === 'bottom'
  // The kiosk navbar's auto-hide lives here, not in the navbar: React Aria renders everything
  // inside `Tabs` a second time, hidden, to build its collection, so a hook in the navbar would
  // run twice and the hidden copy would keep hiding a pinned navbar (and shifting the page).
  // The pin resets on reload and the phone's bottom bar never hides.
  const [navPinned, setNavPinned] = useState(false)
  const navHidden = useAutoHide(!isMobile && !navPinned)
  // The inset the visible kiosk navbar covers; the phone's bottom bar stays in the layout.
  const navInset = isMobile || navHidden ? '0px' : isBottomBar ? BAR_INSET : RAIL_INSET
  // The page and header glide as the navbar slides away or back; a pinned navbar never moves, so
  // neither do they (pinning leaves them exactly where they are, un-pinning does not animate).
  const insetMotion = navPinned
    ? ''
    : 'transition-[padding] duration-300 motion-reduce:transition-none'
  const panelClass = cn(PANEL_CLASS, insetMotion)
  const navbarInsetStyle = {
    '--navbar-inset-bottom': isBottomBar ? navInset : '0px',
    '--navbar-inset-left': isBottomBar ? '0px' : navInset,
  } as CSSProperties
  // A page (the Settings subpage) can ask the shell to hide its header, because it shows its own
  // navigation bar in that place.
  const [headerHidden, setHeaderHidden] = useState(false)
  const headerRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement
    // While the Settings subpage's bar replaces the header, the header is `display: none` (its
    // height reads 0) and the bar publishes its own height instead: never overwrite it.
    const syncHeaderHeight = () => {
      if (header.offsetHeight > 0)
        root.style.setProperty(HEADER_HEIGHT_VAR, `${header.offsetHeight}px`)
    }
    syncHeaderHeight()
    const observer = new ResizeObserver(syncHeaderHeight)
    observer.observe(header)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEADER_HEIGHT_VAR)
    }
  }, [])
  // single router per hub (compose ROUTER_ID) — first id decides; none yet → checking
  const routerId = Object.keys(state.routers)[0]
  const router = state.routers[routerId]
  const routerUpdatedAt = state.routerUpdatedAt[routerId]
  // A tilt driver that died leaves its last `ok` and angles retained on the broker, which read as a
  // live level. Its Device health is the only sign it is gone, so with it offline the pages get no
  // tilt at all: the Dial falls back to the battery, the phone card shows dashes, the van on the
  // map stays level.
  const tilt = tiltDevicesOffline(state) ? NO_TILT : state.tilt

  // `state.tanks` / `state.gps` change on every message, so the derived rows are kept by their
  // content: the Settings context only changes when a Device, its state or its entity count does.
  const derivedDevices = deviceRows(state)
  const devicesKey = JSON.stringify(derivedDevices)
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the content of `derivedDevices`
  const devices = useMemo(() => derivedDevices, [devicesKey])

  // `publish` is a fresh function every render (it only closes over the bus's stable client
  // ref), so the commands bind to a forwarder that always calls the latest one.
  const publishRef = useRef(publish)
  publishRef.current = publish
  const commands = useMemo(
    () => settingsCommands((topic, payload) => publishRef.current(topic, payload)),
    [],
  )

  const handleSleep = useCallback(() => publishRef.current(TOPIC_DISPLAY_POWER_SET, 'off'), [])
  const handleWake = useCallback(() => publishRef.current(TOPIC_DISPLAY_POWER_SET, 'on'), [])

  // The Settings nav bar's bell: stable like the sleep handlers, so the settings memo only changes
  // when a value does. `goToPage` closes over `setActivePage`, recreated each render.
  const goToPageRef = useRef(goToPage)
  goToPageRef.current = goToPage
  const openAlerts = useCallback(() => goToPageRef.current('alerts'), [])
  const settings = useMemo(
    () => ({
      devices,
      tanks: state.tanks,
      temperatures: state.temperatures,
      relays: state.relays,
      router,
      routerHealth,
      routerUpdatedAt,
      busStatus: status,
      tailscale,
      hub,
      hubStatus,
      broker,
      brightness,
      autoSleepEnabled,
      autoSleepTimeoutMinutes,
      displayPower,
      sleepDisplay: handleSleep,
      wakeDisplay: handleWake,
      unseenAlertCount,
      openAlerts,
      ...commands,
      alertsEnabled,
      setAlertsEnabled,
      demoMode,
      setDemoMode,
      theme,
      setTheme,
      navbarPosition,
      setNavbarPosition,
      startPowerSources,
      setStartPowerSources,
      powerLayout,
      setPowerLayout,
      mapTheme,
      setMapTheme,
      van,
      setVanField,
    }),
    [
      devices,
      state.tanks,
      state.temperatures,
      state.relays,
      router,
      routerHealth,
      routerUpdatedAt,
      status,
      tailscale,
      hub,
      hubStatus,
      broker,
      brightness,
      autoSleepEnabled,
      autoSleepTimeoutMinutes,
      displayPower,
      handleSleep,
      handleWake,
      unseenAlertCount,
      openAlerts,
      commands,
      alertsEnabled,
      setAlertsEnabled,
      demoMode,
      setDemoMode,
      theme,
      setTheme,
      navbarPosition,
      setNavbarPosition,
      startPowerSources,
      setStartPowerSources,
      powerLayout,
      setPowerLayout,
      mapTheme,
      setMapTheme,
      van,
      setVanField,
    ],
  )

  // The rail spans the full height of the app (header included), so while it is up the header pads
  // itself clear of it, which pushes the logo to the right; the pages do the same for their edge.
  const header = (
    <header
      ref={headerRef}
      className={cn(
        'grid shrink-0 grid-cols-[1fr_auto_1fr] items-center py-2 pr-4 pl-[calc(1rem+var(--navbar-inset-left))]',
        insetMotion,
        isMobile && 'bg-surface border-border border-b',
        headerHidden && 'hidden',
      )}
    >
      {/* A real link (so long-press/middle-click behave), but a plain tap is a one-entry SPA
          transition to Start, the same as its nav tab. 44px tall: the touch-target minimum. */}
      <a
        href="?page=start"
        aria-label="renewvan"
        className="flex h-11 items-center justify-self-start"
        onClick={(event) => {
          if (event.defaultPrevented || event.button !== 0) return
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
          event.preventDefault()
          goToPage('start')
        }}
      >
        <img src={theme === 'dark' ? lockupDark : lockupLight} alt="" className="h-10 w-auto" />
      </a>
      <Clock />
      <div className="flex items-center justify-end gap-1.5">
        {/* Not a control: a persistent mark that every number on screen is simulated. */}
        {demoMode && (
          <span className="bg-warning text-warning-foreground rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase">
            Demo
          </span>
        )}
        <UplinkStatusButton
          router={router}
          routerHealth={routerHealth}
          lastReceivedAt={routerUpdatedAt}
          tailscale={tailscale}
          busStatus={status}
          hub={hub}
          onOpenSettings={() => openSettings('connectivity')}
        />
        <Separator orientation="vertical" className="mx-0.5 h-6" />
        <ThemeToggleButton theme={theme} onThemeChange={setTheme} />
        <AlertsButton
          onClick={() => goToPage('alerts')}
          count={unseenAlertCount}
          active={activePage === 'alerts'}
        />
        <DisplaySleepButton displayPower={displayPower} onSleep={handleSleep} onWake={handleWake} />
      </div>
    </header>
  )

  // One page per nav item; one that is not built yet (Heater) shows a stub.
  const renderPage = (item: NavItem) => {
    switch (item.id) {
      case 'start':
        return (
          <StartPage
            tanks={state.tanks}
            batteries={state.batteries}
            solar={state.solar}
            chargers={state.chargers}
            temperatures={state.temperatures}
            gps={state.gps}
            tilt={tilt}
            powerSources={startPowerSources}
            isDark={theme === 'dark'}
          />
        )
      case 'power':
        return (
          <PowerPage
            batteries={state.batteries}
            solar={state.solar}
            chargers={state.chargers}
            layout={powerLayout}
          />
        )
      case 'tanks':
        return <TanksPage tanks={state.tanks} onConfigure={openTankSettings} />
      case 'map':
        // MapLibre is most of the bundle and only this page needs it, so it loads on first visit.
        return (
          <Suspense fallback={<MapLoading />}>
            <MapPage
              gps={state.gps}
              tilt={tilt}
              isDark={resolveMapIsDark(mapTheme, theme === 'dark')}
            />
          </Suspense>
        )
      case 'switches':
        return (
          <RelaysPage
            relays={state.relays}
            deviceOnline={relayDevicesOnline(state)}
            demo={demoMode}
            onSetRelay={commands.setRelay}
          />
        )
      case 'settings':
        return (
          <SettingsProvider value={settings}>
            <SettingsPage />
          </SettingsProvider>
        )
      default:
        return <StubPane id={item.id} title={item.label} icon={item.icon} />
    }
  }

  const panels = (
    <>
      {NAV_ITEMS.map((item) => (
        <Tabs.Panel key={item.id} id={item.id} className={panelClass}>
          {renderPage(item)}
        </Tabs.Panel>
      ))}
      <Tabs.Panel id="alerts" className={panelClass}>
        <AlertsPage entries={alertHistory.entries} onRemove={alertHistory.remove} />
      </Tabs.Panel>
    </>
  )

  return (
    <ShellHeaderContext.Provider value={setHeaderHidden}>
      <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
        {/* One `Tabs` root holds the header, the nav and the panes, so the left rail can span the
          full height of the app. The nav precedes the panes in the DOM (React Aria warns when a
          tab panel renders before its tab list). On the kiosk the nav, rail or bar, is an
          absolutely positioned, translucent, auto-hiding overlay that never pushes the panes;
          the root publishes how much of their edge it covers (`navbarInsetStyle`) and the header
          and any page that must not run under it pad themselves by that. Phone: `Sidebar`'s own
          bottom bar, moved below the panes by its `order-last`. Keyed by layout: HeroUI's sliding
          indicator measures its tab once and does not re-measure when the list swaps between the
          rail and a bar under the same root. */}
        <Tabs
          key={isMobile ? 'phone' : navbarPosition}
          selectedKey={activePage}
          onSelectionChange={(key) => goToPage(String(key))}
          orientation={isMobile || isBottomBar ? 'horizontal' : 'vertical'}
          style={navbarInsetStyle}
          className={cn('min-h-0 flex-1 gap-0!', !isMobile && 'relative overflow-hidden')}
        >
          {isBottomBar ? (
            <BottomNavBar
              items={NAV_ITEMS}
              hidden={navHidden}
              pinned={navPinned}
              onPinnedChange={setNavPinned}
            />
          ) : (
            <Sidebar
              items={NAV_ITEMS}
              isMobile={isMobile}
              hidden={navHidden}
              pinned={navPinned}
              onPinnedChange={setNavPinned}
            />
          )}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {header}
            {panels}
          </div>
        </Tabs>
      </div>
    </ShellHeaderContext.Provider>
  )
}

export default App
