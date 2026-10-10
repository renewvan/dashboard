import { useLayoutEffect, useMemo, useRef } from 'react'
import { Bell, LayoutPanelLeft, Droplet, Wrench, ToggleLeft, Zap, Heater, Map } from 'lucide-react'
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
import { SettingsTab } from '@/components/settings/SettingsTab'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { useAlertToasts } from '@/hooks/useAlertToasts'
import { useAlertsEnabled } from '@/hooks/useAlertsEnabled'
import { useIsMobile } from '@/hooks/use-media-query'
import { useUnseenAlertCount } from '@/hooks/useUnseenAlertCount'
import { useRenewvanBus } from '@/hooks/useRenewvanBus'
import { connectedNodes } from '@/lib/nodes'
import { useTheme } from '@/hooks/useTheme'
import { useSidebarCollapsed } from '@/hooks/useSidebarCollapsed'
import { SidebarToggle } from '@/components/SidebarToggle'
import { useUrlTab } from '@/hooks/useUrlTab'

const NAV_ITEMS: NavItem[] = [
  { id: 'start', label: 'Start', icon: <LayoutPanelLeft className="size-5" /> },
  { id: 'power', label: 'Power', icon: <Zap className="size-5" /> },
  { id: 'tanks', label: 'Tanks', icon: <Droplet className="size-5" /> },
  { id: 'gps', label: 'GPS', icon: <Map className="size-5" /> },
  { id: 'switches', label: 'Switches', icon: <ToggleLeft className="size-5" /> },
  { id: 'heater', label: 'Heater', icon: <Heater className="size-5" /> },
  { id: 'settings', label: 'Settings', icon: <Wrench className="size-5" /> },
]

// Reachable via the header's `AlertsButton` + `?tab=alerts` deep link
// only — deliberately excluded from `NAV_ITEMS`/`Sidebar` per explicit
// request, so `useUrlTab` needs its own superset of valid ids.
const TAB_IDS = [...NAV_ITEMS.map((item) => item.id), 'alerts']

/** Custom property the header publishes on `<html>` so the toast region (portaled to `<body>`, see `main.tsx`) can sit below it. */
const HEADER_HEIGHT_VAR = '--app-header-height'

// HeroUI's component CSS is unlayered, so utilities need `!` to override its spacing; the shell sizes panes itself.
const PANEL_CLASS = 'm-0! flex min-h-0 min-w-0 flex-1 flex-col p-0!'

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
    publish,
  } = useRenewvanBus()
  const [alertsEnabled] = useAlertsEnabled()
  useAlertToasts({ tanks: state.tanks, status, tailscale, enabled: alertsEnabled })
  const [activeTab, setActiveTab] = useUrlTab(TAB_IDS, 'start')
  const unseenAlertCount = useUnseenAlertCount(activeTab)
  const [theme, setTheme] = useTheme()
  const isMobile = useIsMobile()
  const [sidebarCollapsed, setSidebarCollapsed] = useSidebarCollapsed()
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

  const settings = useMemo(
    () => ({
      nodes,
      temperatures: state.temperatures,
      router,
      routerHealth,
      routerUpdatedAt,
      busStatus: status,
      tailscale,
      brightness,
      autoSleepEnabled,
      autoSleepTimeoutMinutes,
    }),
    [
      nodes,
      state.temperatures,
      router,
      routerHealth,
      routerUpdatedAt,
      status,
      tailscale,
      brightness,
      autoSleepEnabled,
      autoSleepTimeoutMinutes,
    ],
  )

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  const header = (
    <header
      ref={headerRef}
      className={cn(
        'bg-surface border-border grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b py-1.5 pr-3',
        isMobile ? 'pl-3' : 'pl-1.5',
      )}
    >
      {isMobile ? (
        <img
          src={theme === 'dark' ? lockupDark : lockupLight}
          alt="renewvan"
          className="h-8 w-auto justify-self-start"
        />
      ) : (
        <div className="justify-self-start">
          <SidebarToggle collapsed={sidebarCollapsed} onCollapsedChange={setSidebarCollapsed} />
        </div>
      )}
      <Clock />
      <div className="flex items-center justify-end gap-1.5">
        {/* single router per hub (hub compose's ROUTER_ID) */}
        <UplinkStatusButton
          router={state.routers[routerId]}
          routerHealth={routerHealth}
          lastReceivedAt={state.routerUpdatedAt[routerId]}
          tailscale={tailscale}
          busStatus={status}
          onOpenSettings={() => setActiveTab('settings')}
        />
        <Separator orientation="vertical" className="mx-1.5 h-6" />
        <AlertsButton
          onClick={() => setActiveTab('alerts')}
          count={unseenAlertCount}
          active={activeTab === 'alerts'}
        />
        <ThemeToggleButton theme={theme} onThemeChange={setTheme} />
        <DisplaySleepButton displayPower={displayPower} onSleep={handleSleep} onWake={handleWake} />
      </div>
    </header>
  )

  const panels = (
    <>
      {NAV_ITEMS.map((item) => (
        <Tabs.Panel key={item.id} id={item.id} className={PANEL_CLASS}>
          {item.id === 'settings' ? (
            <SettingsProvider value={settings}>
              <SettingsTab />
            </SettingsProvider>
          ) : (
            <StubPane id={item.id} title={item.label} icon={item.icon} />
          )}
        </Tabs.Panel>
      ))}
      <Tabs.Panel id="alerts" className={PANEL_CLASS}>
        <StubPane id="alerts" title="Alerts" icon={<Bell className="size-5" />} />
      </Tabs.Panel>
    </>
  )

  return (
    <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
      {/* Kiosk: the rail owns the full height (brand on top) and the header
          sits beside it, above the panes — one row `Tabs` root. Mobile: the
          header spans the top and the nav becomes a bottom bar. Either way
          the nav precedes the panes in the DOM (React Aria warns when a tab
          panel renders before its tab list); on mobile the Sidebar's own
          `order-last` moves the bar below the panes. */}
      {isMobile && header}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
        orientation={isMobile ? 'horizontal' : 'vertical'}
        className="min-h-0 flex-1 gap-0!"
      >
        <Sidebar items={NAV_ITEMS} isMobile={isMobile} collapsed={sidebarCollapsed} theme={theme} />
        {isMobile ? (
          panels
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {header}
            {panels}
          </div>
        )}
      </Tabs>
    </div>
  )
}

export default App
