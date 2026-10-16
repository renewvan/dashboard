import { useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Bell, Gauge, Droplet, Wrench, ToggleLeft, Zap, Heater, Map } from 'lucide-react'
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
import { SettingsProvider } from '@/components/settings/SettingsProvider'
import { SettingsPage } from '@/components/settings/SettingsPage'
import type { SettingsSubView } from '@/components/settings/views'
import { TanksPage } from '@/components/tanks/TanksPage'
import { GpsPage } from '@/components/gps/GpsPage'
import { StartPage } from '@/components/start/StartPage'
import { PowerPage } from '@/components/power/PowerPage'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { useAlertToasts } from '@/hooks/useAlertToasts'
import { useAlertsEnabled } from '@/hooks/useAlertsEnabled'
import { useIsMobile } from '@/hooks/use-media-query'
import { useUnseenAlertCount } from '@/hooks/useUnseenAlertCount'
import { useRenewvanBus } from '@/hooks/useRenewvanBus'
import { connectedNodes } from '@/lib/nodes'
import { settingsCommands } from '@/lib/settings-commands'
import { useAutoHide } from '@/hooks/useAutoHide'
import { useTheme } from '@/hooks/useTheme'
import { BottomNavBar } from '@/components/BottomNavBar'
import { useNavbarPosition } from '@/hooks/useNavbarPosition'
import { useStartPowerSources } from '@/hooks/useStartPowerSources'
import { usePowerLayout } from '@/hooks/usePowerLayout'
import { useUrlPage } from '@/hooks/useUrlPage'

const NAV_ITEMS: NavItem[] = [
  { id: 'start', label: 'Start', icon: <Gauge className="size-5" /> },
  { id: 'power', label: 'Power', icon: <Zap className="size-5" /> },
  { id: 'tanks', label: 'Tanks', icon: <Droplet className="size-5" /> },
  { id: 'gps', label: 'GPS', icon: <Map className="size-5" /> },
  { id: 'switches', label: 'Switches', icon: <ToggleLeft className="size-5" /> },
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

function App() {
  const {
    state,
    status,
    displayPower,
    brightness,
    autoSleepEnabled,
    autoSleepTimeoutMinutes,
    tailscale,
    routerHealth,
    demoMode,
    setDemoMode,
    publish,
  } = useRenewvanBus()
  const [alertsEnabled, setAlertsEnabled] = useAlertsEnabled()
  useAlertToasts({ tanks: state.tanks, status, tailscale, enabled: alertsEnabled })
  const [activePage, setActivePage] = useUrlPage(PAGE_IDS, 'start')
  // A view (and the tank it shows) belongs to the Settings page: any other page change leaves
  // both behind (one entry).
  const goToPage = (id: string) => setActivePage(id, { view: null, tank: null })
  // One history entry for page and view together, so Back returns to the previous page.
  const openSettings = (view: SettingsSubView) => setActivePage('settings', { view, tank: null })
  // The tank's Configure button: Settings › Nodes › Tanks › <tank>, page, view and tank in one entry.
  const openTankSettings = (tankId: string) =>
    setActivePage('settings', { view: 'tank', tank: tankId })
  const unseenAlertCount = useUnseenAlertCount(activePage)
  const [theme, setTheme] = useTheme()
  const isMobile = useIsMobile()
  const [navbarPosition, setNavbarPosition] = useNavbarPosition()
  const [startPowerSources, setStartPowerSources] = useStartPowerSources()
  const [powerLayout, setPowerLayout] = usePowerLayout()
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
  const headerRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement
    const syncHeaderHeight = () =>
      root.style.setProperty(HEADER_HEIGHT_VAR, `${header.offsetHeight}px`)
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

  // `state.tanks` / `state.gps` change on every message, so the derived node list is
  // kept by its content: the Settings context only changes when a node or its count does.
  const connected = connectedNodes(state)
  const nodesKey = connected.map((node) => `${node.domain}:${node.count}`).join()
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the key is the content of `connected`
  const nodes = useMemo(() => connected, [nodesKey])

  // `publish` is a fresh function every render (it only closes over the bus's stable client
  // ref), so the commands bind to a forwarder that always calls the latest one.
  const publishRef = useRef(publish)
  publishRef.current = publish
  const commands = useMemo(
    () => settingsCommands((topic, payload) => publishRef.current(topic, payload)),
    [],
  )

  const settings = useMemo(
    () => ({
      nodes,
      tanks: state.tanks,
      temperatures: state.temperatures,
      router,
      routerHealth,
      routerUpdatedAt,
      busStatus: status,
      tailscale,
      brightness,
      autoSleepEnabled,
      autoSleepTimeoutMinutes,
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
    }),
    [
      nodes,
      state.tanks,
      state.temperatures,
      router,
      routerHealth,
      routerUpdatedAt,
      status,
      tailscale,
      brightness,
      autoSleepEnabled,
      autoSleepTimeoutMinutes,
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
    ],
  )

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  // The rail spans the full height of the app (header included), so while it is up the header pads
  // itself clear of it, which pushes the logo to the right; the pages do the same for their edge.
  const header = (
    <header
      ref={headerRef}
      className={cn(
        'grid shrink-0 grid-cols-[1fr_auto_1fr] items-center py-2 pr-4 pl-[calc(1rem+var(--navbar-inset-left))]',
        insetMotion,
        isMobile && 'bg-surface border-border border-b',
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
        {/* single router per hub (hub compose's ROUTER_ID) */}
        <UplinkStatusButton
          router={state.routers[routerId]}
          routerHealth={routerHealth}
          lastReceivedAt={state.routerUpdatedAt[routerId]}
          tailscale={tailscale}
          busStatus={status}
          onOpenSettings={() => openSettings('cellular')}
        />
        <Separator orientation="vertical" className="mx-0.5 h-6" />
        <AlertsButton
          onClick={() => goToPage('alerts')}
          count={unseenAlertCount}
          active={activePage === 'alerts'}
        />
        <ThemeToggleButton theme={theme} onThemeChange={setTheme} />
        <DisplaySleepButton displayPower={displayPower} onSleep={handleSleep} onWake={handleWake} />
      </div>
    </header>
  )

  const panels = (
    <>
      {NAV_ITEMS.map((item) => (
        <Tabs.Panel key={item.id} id={item.id} className={panelClass}>
          {item.id === 'settings' ? (
            <SettingsProvider value={settings}>
              <SettingsPage />
            </SettingsProvider>
          ) : item.id === 'start' ? (
            <StartPage
              tanks={state.tanks}
              batteries={state.batteries}
              solar={state.solar}
              chargers={state.chargers}
              temperatures={state.temperatures}
              gps={state.gps}
              tilt={state.tilt}
              powerSources={startPowerSources}
              isDark={theme === 'dark'}
            />
          ) : item.id === 'power' ? (
            <PowerPage
              batteries={state.batteries}
              solar={state.solar}
              chargers={state.chargers}
              layout={powerLayout}
            />
          ) : item.id === 'tanks' ? (
            <TanksPage tanks={state.tanks} onConfigure={openTankSettings} />
          ) : item.id === 'gps' ? (
            <GpsPage gps={state.gps} />
          ) : (
            <StubPane id={item.id} title={item.label} icon={item.icon} />
          )}
        </Tabs.Panel>
      ))}
      <Tabs.Panel id="alerts" className={panelClass}>
        <StubPane id="alerts" title="Alerts" icon={<Bell className="size-5" />} />
      </Tabs.Panel>
    </>
  )

  return (
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
  )
}

export default App
