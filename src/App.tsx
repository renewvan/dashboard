import { Droplet, Settings as SettingsIcon, ToggleLeft, Zap } from 'lucide-react'
import { useState } from 'react'
import { ConnectionBanner } from './components/ConnectionBanner'
import { Sidebar, type NavItem } from './components/Sidebar'
import { SleepOverlay } from './components/SleepOverlay'
import { Tabs as TabsRoot, TabsPanel } from './components/ui/tabs'
import { useRenewvanBus } from './hooks/useRenewvanBus'
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
  const [collapsed, setCollapsed] = useState(false)

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  return (
    <TabsRoot
      value={activeTab}
      onValueChange={(value) => setActiveTab(value as string)}
      orientation="vertical"
      className="dark h-svh gap-0 overflow-hidden bg-background text-foreground"
    >
      <SleepOverlay displayPower={displayPower} onWake={handleWake} />
      <Sidebar items={NAV_ITEMS} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((c) => !c)} />
      <div className="flex-1 overflow-y-auto p-4">
        <ConnectionBanner status={status} />
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
          <SettingsTab displayPower={displayPower} onSleep={handleSleep} onWake={handleWake} tailscale={tailscale} />
        </TabsPanel>
      </div>
    </TabsRoot>
  )
}

export default App
