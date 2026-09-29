import { Droplet, Moon, Power, Settings as SettingsIcon, Sun, ToggleLeft, Zap } from 'lucide-react'
import { useState } from 'react'
import wallpaperLight from '../assets/light-unsplash.jpg'
import lockupInk from '../assets/logo/renewvan-lockup.svg'
import lockupWhite from '../assets/logo/renewvan-lockup-white.svg'
import { Clock } from './components/Clock'
import { IconSwitch } from './components/IconSwitch'
import { RouterStatusIcon } from './components/RouterStatusIcon'
import { Sidebar, type NavItem } from './components/Sidebar'
import { SleepOverlay } from './components/SleepOverlay'
import { Tabs as TabsRoot, TabsPanel } from './components/ui/tabs'
import { useRenewvanBus } from './hooks/useRenewvanBus'
import { useTheme } from './hooks/useTheme'
import { cn } from './lib/utils'
import { PowerTab } from './tabs/PowerTab'
import { SettingsTab } from './tabs/SettingsTab'
import { SwitchesTab } from './tabs/SwitchesTab'
import { TanksTab } from './tabs/TanksTab'

const NAV_ITEMS: NavItem[] = [
  { id: 'tanks', label: 'Tanks', icon: <Droplet /> },
  { id: 'power', label: 'Power', icon: <Zap /> },
  { id: 'switches', label: 'Switches', icon: <ToggleLeft /> },
  { id: 'settings', label: 'Settings', icon: <SettingsIcon /> },
]

function App() {
  const { state, status, displayPower, tailscale, publish } = useRenewvanBus()
  const [activeTab, setActiveTab] = useState('tanks')
  const [theme, setTheme] = useTheme()

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  return (
    <TabsRoot
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as string)}
      orientation="vertical"
      className={cn(
        'relative flex h-svh flex-col! gap-4 overflow-hidden p-4 text-foreground',
        theme === 'dark' && 'dark',
      )}
    >
      {/* Dark theme: a solid ink background (var(--panel), #0f1a2a — the
          same navy as the brand's "ink" logo mark), not a photo. Light
          theme keeps the pre-blurred wallpaper photo behind the glass
          surfaces; scaled up so the blur radius never reveals a sharp/
          transparent edge. */}
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 bg-[var(--panel)]',
          theme === 'light' && 'scale-105 bg-cover bg-center blur-xs',
        )}
        style={theme === 'light' ? { backgroundImage: `url(${wallpaperLight})` } : undefined}
      />
      <SleepOverlay displayPower={displayPower} onWake={handleWake} />
      <header className="flex shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-card/40 px-3 py-1.5 backdrop-blur-md">
        <img
          src={theme === 'dark' ? lockupWhite : lockupInk}
          alt="renewvan"
          className="h-6 w-auto"
        />
        <div className="flex items-center gap-1">
          <IconSwitch
            id="header-dark-theme-toggle"
            icon={theme === 'dark' ? <Moon /> : <Sun />}
            ariaLabel="Dark theme"
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
            testId="dark-theme-toggle"
          />
          <IconSwitch
            id="header-display-power-toggle"
            icon={<Power />}
            ariaLabel="Display"
            checked={displayPower !== 'off'}
            disabled={displayPower === null}
            onCheckedChange={(checked) => (checked ? handleWake() : handleSleep())}
            testId="display-power-toggle"
          />
          <Clock />
          <RouterStatusIcon status={status} />
        </div>
      </header>
      <div className="flex flex-1 gap-4 overflow-hidden">
        <Sidebar items={NAV_ITEMS} />
        <div className="flex flex-1 flex-col overflow-y-auto rounded-2xl border border-white/10 bg-card/40 p-4 backdrop-blur-md">
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
