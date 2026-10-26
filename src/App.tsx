import { lazy, Suspense, useState } from 'react'
import { Gauge, Droplet, Heater, Map, Settings, ToggleLeft, Zap } from 'lucide-react'
import { Separator, Tabs } from '@heroui/react'
import lockupLight from '../assets/logo/svg/renewvan-lockup-light.svg'
import lockupDark from '../assets/logo/svg/renewvan-lockup-dark.svg'
import { cn } from '@/lib/utils'
import { Clock } from '@/components/Clock'
import { HeaderMenu } from '@/components/HeaderMenu'
import { LogoLink } from '@/components/LogoLink'
import { DrawerMenuControls, DrawerMenuFooter } from '@/components/DrawerMenuContent'
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
import { useIsMobile } from '@/hooks/use-media-query'
import { useUnseenAlertCount } from '@/hooks/useUnseenAlertCount'
import { useRenewvanBus } from '@/hooks/useRenewvanBus'
import { driverRows, relayDriversOnline, tiltDriversOffline } from '@/lib/drivers'
import { AUTO_PRIMARY_BATTERY } from '@/lib/primaryBattery'
import type { RenewvanBusState } from '@/types'
import { useDisplayCommands } from '@/hooks/useDisplayCommands'
import { useContentStable, useStableCallback } from '@/hooks/useStable'
import { useHeaderHeightVar, useShellLayout } from '@/hooks/useShellLayout'
import { BottomNavBar } from '@/components/BottomNavBar'
import { resolveMapIsDark } from '@/hooks/useMapTheme'
import { usePreferences } from '@/hooks/usePreferences'
import { buildSettings } from '@/components/settings/buildSettings'
import { useUrlPage } from '@/hooks/useUrlPage'
import { useHubAddress } from '@/hooks/useHubAddress'
import { useBrokerLink } from '@/hooks/useBrokerLink'
import { ShellHeaderContext } from '@/components/settings/ShellHeaderContext'

// MapLibre is most of the bundle and only the Map page uses it, so that page loads on first visit
// instead of with every other page. `MapPage` is a named export, which `lazy` needs as a default.
const MapPage = lazy(() => import('@/components/map/MapPage').then((m) => ({ default: m.MapPage })))

/** What the Map pane shows for the moment its chunk loads: a quiet pane until the map itself can draw. */
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
  { id: 'settings', label: 'Settings', icon: <Settings className="size-5" /> },
]

// Reachable via the header's `AlertsButton` + `?page=alerts` deep link
// only — deliberately excluded from `NAV_ITEMS`/`Sidebar` per explicit
// request, so `useUrlPage` needs its own superset of valid ids.
const PAGE_IDS = [...NAV_ITEMS.map((item) => item.id), 'alerts']

function App() {
  const bus = useRenewvanBus()
  const {
    state,
    status,
    displayPower,
    tailscale,
    hubStatus,
    primaryBattery,
    routerHealth,
    demoMode,
    publish,
  } = bus
  // No retained choice yet (or one that is not a string) reads as Auto.
  const primaryBatterySelection = primaryBattery ?? AUTO_PRIMARY_BATTERY
  const prefs = usePreferences()
  const { theme, navbarPosition, mapTheme, alertsEnabled, startPowerSources, powerLayout } =
    prefs.preferences
  const { setTheme } = prefs.actions
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
  // The tank's Configure button: Settings › Drivers › Tanks › <tank>, page, view and tank in one entry.
  const openTankSettings = (tankId: string) =>
    setActivePage('settings', { view: 'tank', tank: tankId })
  const unseenAlertCount = useUnseenAlertCount(activePage)
  const isMobile = useIsMobile()
  // Derived at render and never written: the stored kiosk choice survives a phone visit.
  const {
    isBottomBar,
    navPinned,
    setNavPinned,
    navHidden,
    insetMotion,
    panelClass,
    navbarInsetStyle,
  } = useShellLayout(isMobile, navbarPosition)
  // A page (the Settings subpage) can ask the shell to hide its header, because it shows its own
  // navigation bar in that place.
  const [headerHidden, setHeaderHidden] = useState(false)
  const headerRef = useHeaderHeightVar()
  // single router per hub (compose ROUTER_ID) — first id decides; none yet → checking
  const routerId = Object.keys(state.routers)[0]
  const router = state.routers[routerId]
  const routerUpdatedAt = state.routerUpdatedAt[routerId]
  // A tilt driver that died leaves its last `ok` and angles retained on the broker, which read as a
  // live level. Its Driver health is the only sign it is gone, so with it offline the pages get no
  // tilt at all: the Dial falls back to the battery, the phone card shows dashes, the van on the
  // map stays level.
  const tilt = tiltDriversOffline(state) ? NO_TILT : state.tilt

  // `state.tanks` / `state.gps` change on every message, so the derived rows and the GPS record
  // (every satellite's signal, a fresh object every poll, ~3s) are kept by their content: the
  // Settings context, and the whole memoised Settings tree, re-render only when a value changes.
  const drivers = useContentStable(driverRows(state))
  const gps = useContentStable(state.gps)

  const { commands, sleepDisplay, wakeDisplay } = useDisplayCommands(publish)

  // The Settings nav bar's bell: stable like the sleep handlers, so the settings value only changes
  // when a field does. `goToPage` closes over `setActivePage`, recreated each render.
  const openAlerts = useStableCallback(() => goToPage('alerts'))
  const settings = buildSettings({
    bus,
    derived: {
      drivers,
      gps,
      router,
      routerUpdatedAt,
      hub,
      broker,
      primaryBatterySelection,
      unseenAlertCount,
    },
    preferences: prefs,
    commands,
    handlers: { sleepDisplay, wakeDisplay, openAlerts },
  })

  const demoBadge = demoMode && (
    <span className="bg-warning text-warning-foreground rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase">
      Demo
    </span>
  )

  const uplinkProps = {
    router,
    routerHealth,
    lastReceivedAt: routerUpdatedAt,
    tailscale,
    busStatus: status,
    hub,
    onOpenSettings: () => openSettings('connectivity'),
  }

  // The kiosk header: a row of icon buttons.
  const headerControls = (
    <>
      {demoBadge}
      <UplinkStatusButton {...uplinkProps} />
      <Separator orientation="vertical" className="mx-0.5 h-6" />
      <ThemeToggleButton theme={theme} onThemeChange={setTheme} />
      <AlertsButton
        onClick={() => goToPage('alerts')}
        count={unseenAlertCount}
        active={activePage === 'alerts'}
      />
    </>
  )

  const logo = theme === 'dark' ? lockupDark : lockupLight

  // The drawer's header row: the logo, linked to Start, beside the close control.
  const menuLogo = (close: () => void) => (
    <LogoLink
      src={logo}
      onNavigate={() => {
        close()
        goToPage('start')
      }}
    />
  )

  const menuControls = (close: () => void) => (
    <DrawerMenuControls close={close} onOpenVan={() => openSettings('van')} />
  )

  const menuFooter = (close: () => void) => (
    <DrawerMenuFooter
      close={close}
      activePage={activePage}
      unseenAlertCount={unseenAlertCount}
      onGoToPage={goToPage}
      uplink={uplinkProps}
      theme={theme}
      onThemeChange={setTheme}
      displayPower={displayPower}
      onSleep={sleepDisplay}
      onWake={wakeDisplay}
    />
  )

  // The Map runs under its header, so there the header floats over it: out of the layout, with no
  // surface or border, only a soft scrim fading out below it so the logo and icons stay readable on
  // any tile. Everywhere else it is a bar above the page.
  const floatingHeader = activePage === 'map' && !headerHidden
  // The rail spans the full height of the app (header included), so while it is up the kiosk header
  // pads itself clear of it, which pushes the logo to the right; the pages do the same for their edge.
  const header = (
    <header
      ref={headerRef}
      className={cn(
        isMobile
          ? 'flex items-center justify-between px-4 py-2'
          : 'grid grid-cols-[1fr_auto_1fr] items-center py-2 pr-4 pl-[calc(1rem+var(--navbar-inset-left))]',
        floatingHeader
          ? 'pointer-events-none absolute inset-x-0 top-0 z-20 bg-linear-to-b from-black/50 to-transparent [&>*]:pointer-events-auto'
          : 'shrink-0',
        insetMotion,
        isMobile && !floatingHeader && 'bg-surface border-border border-b',
        headerHidden && 'hidden',
      )}
    >
      {isMobile && (
        <HeaderMenu logo={menuLogo} footer={menuFooter}>
          {menuControls}
        </HeaderMenu>
      )}
      <LogoLink
        src={logo}
        className={!isMobile ? 'justify-self-start' : undefined}
        onNavigate={() => goToPage('start')}
      />
      {!isMobile && <Clock />}
      {isMobile ? (
        <div className="flex items-center gap-1.5">{demoBadge}</div>
      ) : (
        <div className="flex items-center justify-end gap-1.5">
          {headerControls}
          <DisplaySleepButton
            displayPower={displayPower}
            onSleep={sleepDisplay}
            onWake={wakeDisplay}
          />
        </div>
      )}
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
            primaryBatterySelection={primaryBatterySelection}
            solar={state.solar}
            chargers={state.chargers}
            temperatures={state.temperatures}
            gps={state.gps}
            tilt={tilt}
            powerSources={startPowerSources}
            powerLayout={powerLayout}
            isDark={theme === 'dark'}
            mapIsDark={resolveMapIsDark(mapTheme, theme === 'dark')}
            onConfigureTank={openTankSettings}
          />
        )
      case 'power':
        return (
          <PowerPage
            batteries={state.batteries}
            primaryBatterySelection={primaryBatterySelection}
            drivers={drivers}
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
            driverOnline={relayDriversOnline(state)}
            demo={demoMode}
            onSetRelay={commands.setRelay}
          />
        )
      case 'settings':
        return (
          <SettingsProvider {...settings}>
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
              items={isMobile ? NAV_ITEMS.filter((item) => item.id !== 'settings') : NAV_ITEMS}
              isMobile={isMobile}
              hidden={navHidden}
              pinned={navPinned}
              onPinnedChange={setNavPinned}
            />
          )}
          <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
            {header}
            {panels}
          </div>
        </Tabs>
      </div>
    </ShellHeaderContext.Provider>
  )
}

export default App
