import { useLayoutEffect, useRef } from 'react'
import { Droplet, Wrench, ToggleLeft, Van, Zap, Heater, Map } from 'lucide-react'
import { Separator, Tabs } from '@heroui/react'
import lockupWhite from '../assets/logo/renewvan-lockup-white.svg'
import lockupDark from '../assets/logo/renewvan-lockup.svg'
import { Clock } from '@/components/Clock'
import { DisplaySleepButton } from '@/components/DisplaySleepButton'
import { AlertsButton } from '@/components/AlertsButton'
import { UplinkStatusButton } from '@/components/UplinkStatusButton'
import { Sidebar, type NavItem } from '@/components/Sidebar'
import { StubPane } from '@/components/StubPane'
import { ThemeToggleButton } from '@/components/ThemeToggleButton'
import { useAlertToasts } from '@/hooks/useAlertToasts'
import { useAlertsEnabled } from '@/hooks/useAlertsEnabled'
import { useIsMobile } from '@/hooks/use-media-query'
import { useUnseenAlertCount } from '@/hooks/useUnseenAlertCount'
import { useRenewvanBus } from '@/hooks/useRenewvanBus'
import { useTheme } from '@/hooks/useTheme'
import { useUrlTab } from '@/hooks/useUrlTab'

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Van className="size-5" /> },
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

// HeroUI's component CSS is unlayered, so utilities need `!` to override its spacing; the shell sizes panes itself.
/** Custom property the header publishes on `<html>` so the toast region (portaled to `<body>`, see `main.tsx`) can sit below it. */
const HEADER_HEIGHT_VAR = '--app-header-height'

const PANEL_CLASS = 'm-0! flex min-h-0 min-w-0 flex-1 flex-col p-0!'

function App() {
  const { state, status, displayPower, tailscale, routerHealth, publish } = useRenewvanBus()
  const [alertsEnabled] = useAlertsEnabled()
  useAlertToasts({ tanks: state.tanks, status, tailscale, enabled: alertsEnabled })
  const [activeTab, setActiveTab] = useUrlTab(TAB_IDS, 'home')
  const unseenAlertCount = useUnseenAlertCount(activeTab)
  const [theme, setTheme] = useTheme()
  const isMobile = useIsMobile()
  const headerRef = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const header = headerRef.current
    if (!header) return
    const root = document.documentElement
    const publish = () => root.style.setProperty(HEADER_HEIGHT_VAR, `${header.offsetHeight}px`)
    publish()
    const observer = new ResizeObserver(publish)
    observer.observe(header)
    return () => {
      observer.disconnect()
      root.style.removeProperty(HEADER_HEIGHT_VAR)
    }
  }, [])
  // single router per hub (compose ROUTER_ID) — first id decides; none yet → checking
  const routerId = Object.keys(state.routers)[0]

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  return (
    <div className="bg-background text-foreground flex h-svh flex-col overflow-hidden">
      <header
        ref={headerRef}
        className="bg-surface border-border grid shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b px-3 py-1.5"
      >
        <img
          src={theme === 'dark' ? lockupWhite : lockupDark}
          alt="renewvan"
          className="h-7 w-auto justify-self-start"
        />
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
          <DisplaySleepButton
            displayPower={displayPower}
            onSleep={handleSleep}
            onWake={handleWake}
          />
        </div>
      </header>
      {/* The Tabs root lays itself out by orientation: a row (rail + pane)
          in the kiosk, a column on mobile. The nav precedes the panes in the
          DOM in both layouts (React Aria warns when a tab panel renders
          before its tab list); on mobile the Sidebar's own `order-last`
          moves the bar below the panes. */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={(key) => setActiveTab(String(key))}
        orientation={isMobile ? 'horizontal' : 'vertical'}
        className="min-h-0 flex-1 gap-0!"
      >
        <Sidebar items={NAV_ITEMS} isMobile={isMobile} />
        {NAV_ITEMS.map((item) => (
          <Tabs.Panel key={item.id} id={item.id} className={PANEL_CLASS}>
            <StubPane id={item.id} title={item.label} icon={item.icon} />
          </Tabs.Panel>
        ))}
        <Tabs.Panel id="alerts" className={PANEL_CLASS}>
          <StubPane id="alerts" title="Alerts" />
        </Tabs.Panel>
      </Tabs>
    </div>
  )
}

export default App
