import { Droplet, Moon, Settings as SettingsIcon, Sun, ToggleLeft, Van, Zap } from 'lucide-react'
import { useState } from 'react'
import wallpaperLight from '../assets/light-unsplash.jpg'
import wallpaperDark from '../assets/dark-unsplash.jpg'
import lockupInk from '../assets/logo/renewvan-lockup.svg'
import lockupWhite from '../assets/logo/renewvan-lockup-white.svg'
import { Clock } from './components/Clock'
import { DisplayPowerButton } from './components/DisplayPowerButton'
import { IconSwitch } from './components/IconSwitch'
import { RouterStatusIcon } from './components/RouterStatusIcon'
import { Sidebar, type NavItem } from './components/Sidebar'
import { SleepOverlay } from './components/SleepOverlay'
import { Tabs as TabsRoot, TabsPanel } from './components/ui/tabs'
import { useRenewvanBus } from './hooks/useRenewvanBus'
import { useTheme, type Theme } from './hooks/useTheme'
import { cn } from './lib/utils'
import { HomeTab } from './tabs/HomeTab'
import { PowerTab } from './tabs/PowerTab'
import { SettingsTab } from './tabs/SettingsTab'
import { SwitchesTab } from './tabs/SwitchesTab'
import { TanksTab } from './tabs/TanksTab'

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: <Van /> },
  { id: 'tanks', label: 'Tanks', icon: <Droplet /> },
  { id: 'power', label: 'Power', icon: <Zap /> },
  { id: 'switches', label: 'Switches', icon: <ToggleLeft /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
]

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
  const { state, status, displayPower, tailscale, publish } = useRenewvanBus()
  const [activeTab, setActiveTab] = useState('home')
  const [theme, setTheme] = useTheme()
  const wallpaper = WALLPAPER[theme]

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  return (
    <TabsRoot
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as string)}
      orientation="vertical"
      className={cn(
        'relative flex h-svh flex-col! gap-3 overflow-hidden p-4 text-foreground',
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
      <SleepOverlay displayPower={displayPower} onWake={handleWake} />
      <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center rounded-2xl border border-white/10 bg-card/40 px-3 py-1.5 backdrop-blur-md">
        <img
          src={theme === 'dark' ? lockupWhite : lockupInk}
          alt="renewvan"
          className="h-6 w-auto justify-self-start"
        />
        <Clock />
        <div className="flex items-center justify-end gap-3">
          <IconSwitch
            id="header-dark-theme-toggle"
            icon={theme === 'dark' ? <Moon /> : <Sun />}
            ariaLabel="Dark theme"
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            testId="dark-theme-toggle"
          />
          <RouterStatusIcon status={status} />
          <DisplayPowerButton displayPower={displayPower} onSleep={handleSleep} onWake={handleWake} />
        </div>
      </header>
      <div className="flex flex-1 gap-3 overflow-hidden">
        <Sidebar items={NAV_ITEMS} />
        <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-md">
          <TabsPanel value="home">
            <HomeTab tanks={state.tanks} batteries={state.batteries} />
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
          <TabsPanel value="settings">
            <SettingsTab tailscale={tailscale} />
          </TabsPanel>
        </div>
      </div>
    </TabsRoot>
  )
}

export default App
