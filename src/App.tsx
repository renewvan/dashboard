import { Droplet, Settings as SettingsIcon, ToggleLeft, Zap } from 'lucide-react'
import { useState } from 'react'
import wallpaperDark from '../assets/dark-unsplash.jpg'
import wallpaperLight from '../assets/light-unsplash.jpg'
import lockupInk from '../assets/logo/renewvan-lockup.svg'
import lockupWhite from '../assets/logo/renewvan-lockup-white.svg'
import { Clock } from './components/Clock'
import { ConnectionStatusButton } from './components/ConnectionStatusButton'
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
      {/* Pre-blurred wallpaper layer, not just backdrop-blur on the glass
          surfaces above it — so the strip of wallpaper visible *around*
          those surfaces (not just seen through them) is soft too. Scaled
          up so the blur radius never reveals a sharp/transparent edge. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 scale-105 bg-cover bg-center blur-xs"
        style={{ backgroundImage: `url(${theme === 'dark' ? wallpaperDark : wallpaperLight})` }}
      />
      <SleepOverlay displayPower={displayPower} onWake={handleWake} />
      <header className="flex shrink-0 items-center justify-between rounded-2xl border border-white/10 bg-card/40 px-4 py-3 backdrop-blur-md">
        <img
          src={theme === 'dark' ? lockupWhite : lockupInk}
          alt="renewvan"
          className="h-8 w-auto"
        />
        <div className="flex items-center gap-3">
          <Clock />
          <ConnectionStatusButton status={status} />
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
            <SettingsTab
              displayPower={displayPower}
              onSleep={handleSleep}
              onWake={handleWake}
              tailscale={tailscale}
              theme={theme}
              onThemeChange={setTheme}
            />
          </TabsPanel>
        </div>
      </div>
    </TabsRoot>
  )
}

export default App
