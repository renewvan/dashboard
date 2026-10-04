import { useEffect, useState } from 'react'
import { Droplet, Wrench, ToggleLeft, Van, Zap, Heater } from 'lucide-react'
import wallpaperLight from '../assets/light-unsplash.jpg'
import wallpaperDark from '../assets/dark-unsplash.jpg'
import lockupWhite from '../assets/logo/renewvan-lockup-white.svg'
import lockupDark from '../assets/logo/renewvan-lockup.svg'
import { EmptyState } from './components/EmptyState'
import { Clock } from './components/Clock'
import { DisplaySleepButton } from './components/DisplaySleepButton'
import { AlertsButton } from './components/AlertsButton'
import { UplinkStatusButton } from './components/UplinkStatusButton'
import { Sidebar, type NavItem } from './components/Sidebar'
import { ThemeToggleButton } from './components/ThemeToggleButton'
import { Tabs as TabsRoot, TabsPanel } from './components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { useAlertToasts } from './hooks/useAlertToasts'
import { useUnseenAlertCount } from './hooks/useUnseenAlertCount'
import { useRenewvanBus } from './hooks/useRenewvanBus'
import { useTheme, type Theme } from './hooks/useTheme'
import { useUrlTab } from './hooks/useUrlTab'
import { cn } from './lib/utils'
import { AlertsTab } from './tabs/AlertsTab'
import { HomeTab } from './tabs/HomeTab'
import { PowerTab } from './tabs/PowerTab'
import { SettingsTab } from './tabs/SettingsTab'
import { SwitchesTab } from './tabs/SwitchesTab'
import { TanksTab } from './tabs/TanksTab'

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Van className="size-5" /> },
  { id: 'power', label: 'Power', icon: <Zap className="size-5" /> },
  { id: 'tanks', label: 'Tanks', icon: <Droplet className="size-5" /> },
  { id: 'switches', label: 'Switches', icon: <ToggleLeft className="size-5" /> },
  { id: 'heater', label: 'Heater', icon: <Heater className="size-5" /> },
  { id: 'settings', label: 'Settings', icon: <Wrench className="size-5" /> },
]

// Reachable via the header's `AlertsButton` + `?tab=alerts` deep link
// only — deliberately excluded from `NAV_ITEMS`/`Sidebar` per explicit
// request, so `useUrlTab` needs its own superset of valid ids.
const TAB_IDS = [...NAV_ITEMS.map((item) => item.id), 'alerts']

// Per-theme wallpaper photo. No entry (or a falsy value) means that
// theme has no photo configured — the background falls back to a solid
// ink color (see the background div below) instead of leaving a blank
// image request. Dark theme has no photo configured right now; if one
// is added later, it starts rendering automatically, no other code
// changes.
const WALLPAPER: Record<Theme, string | undefined> = {
  light: wallpaperLight,
  dark: wallpaperDark,
}

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
  useAlertToasts({ tanks: state.tanks, status, tailscale })
  const [activeTab, setActiveTab] = useUrlTab(TAB_IDS, 'home')
  // Deep-link target for the uplink popover's "Network settings" CTA.
  // Cleared whenever Settings is not the active tab so a plain sidebar
  // entry never inherits a stale focus (SettingsTab reads it only while
  // `active` flips true).
  const [settingsFocus, setSettingsFocus] = useState<'network' | undefined>(undefined)
  useEffect(() => {
    if (activeTab !== 'settings') setSettingsFocus(undefined)
  }, [activeTab])
  const openSettings = (focus?: 'network') => {
    setSettingsFocus(focus)
    setActiveTab('settings')
  }
  const unseenAlertCount = useUnseenAlertCount(activeTab)
  const [theme, setTheme] = useTheme()
  const wallpaper = WALLPAPER[theme]
  // single router per hub (compose ROUTER_ID) — first id decides; none yet → checking
  const routerId = Object.keys(state.routers)[0]
  // Base UI's Dialog/Sheet/Popover portals to document.body by default,
  // which sits OUTSIDE the themed div below (the 'dark' class lives on
  // this root, not <html>) -- so a sheet or popover would render light
  // regardless of theme. Portaling into this ref instead (a direct child
  // of the themed root, deliberately NOT nested under `header`'s
  // `backdrop-blur-md`) fixes the theme without also clipping the
  // portal's `fixed` positioning: `backdrop-filter` establishes a CSS
  // containing block for `position: fixed` descendants, so portaling
  // anywhere under the header would shrink the sheet to the header's box
  // instead of the full viewport.
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null)

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  return (
    <TabsRoot
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as string)}
      orientation="vertical"
      className={cn(
        'text-foreground relative flex h-svh flex-col! gap-2 overflow-hidden px-2 py-1',
        theme === 'dark' && 'dark',
      )}
    >
      {/* bg-[var(--panel)] (the ink navy, #0f1a2a, in dark theme) is the
          fallback: it only shows through when WALLPAPER[theme] has no
          photo. When it does, the photo covers it entirely — scaled up
          and pre-blurred so the blur radius never reveals a sharp/
          transparent edge against the glass surfaces on top of it. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 bg-[var(--panel)]',
          wallpaper && 'scale-105 bg-cover bg-center blur-xs',
        )}
        style={wallpaper ? { backgroundImage: `url(${wallpaper})` } : undefined}
      />
      <div ref={setPortalContainer} />
      <header className="bg-card/40 grid shrink-0 grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-white/10 px-3 py-1.5 backdrop-blur-md">
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
            onOpenSettings={() => openSettings('network')}
            portalContainer={portalContainer}
          />
          <Separator orientation="vertical" className="mx-1.5" />
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
      <div className="flex flex-1 gap-2 overflow-hidden">
        <Sidebar items={NAV_ITEMS} />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <TabsPanel value="home">
            <HomeTab />
          </TabsPanel>
          <TabsPanel value="tanks">
            <TanksTab tanks={state.tanks} />
          </TabsPanel>
          <TabsPanel value="power">
            <PowerTab batteries={state.batteries} />
          </TabsPanel>
          <TabsPanel value="switches">
            <SwitchesTab relays={state.relays} />
          </TabsPanel>
          <TabsPanel value="heater">
            <EmptyState
              icon={<Heater />}
              title="No heater data yet."
              description="Waiting for readings from the renewvan hub."
            />
          </TabsPanel>
          <TabsPanel value="settings">
            <SettingsTab
              tailscale={tailscale}
              brightness={brightness}
              autoSleepEnabled={autoSleepEnabled}
              autoSleepTimeoutMinutes={autoSleepTimeoutMinutes}
              onBrightnessChange={(v) =>
                publish('renewvan/kiosk/display/brightness/set', JSON.stringify(v))
              }
              onAutoSleepEnabledChange={(v) =>
                publish('renewvan/kiosk/display/auto-sleep-enabled/set', JSON.stringify(v))
              }
              onAutoSleepTimeoutMinutesChange={(v) =>
                publish('renewvan/kiosk/display/auto-sleep-timeout-minutes/set', JSON.stringify(v))
              }
              portalContainer={portalContainer}
              active={activeTab === 'settings'}
              router={state.routers[routerId]}
              routerHealth={routerHealth}
              routerUpdatedAt={state.routerUpdatedAt[routerId]}
              busStatus={status}
              focusView={settingsFocus}
            />
          </TabsPanel>
          <TabsPanel value="alerts">
            <AlertsTab />
          </TabsPanel>
        </div>
      </div>
    </TabsRoot>
  )
}

export default App
