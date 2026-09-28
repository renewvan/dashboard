import { useState } from 'react'
import { ConnectionBanner } from './components/ConnectionBanner'
import { SleepOverlay } from './components/SleepOverlay'
import { Tabs } from './components/Tabs'
import { useRenewvanBus } from './hooks/useRenewvanBus'
import { PowerTab } from './tabs/PowerTab'
import { SettingsTab } from './tabs/SettingsTab'
import { SwitchesTab } from './tabs/SwitchesTab'
import { TanksTab } from './tabs/TanksTab'

function App() {
  const { state, status, displayPower, tailscale, publish } = useRenewvanBus()
  const [activeTab, setActiveTab] = useState('tanks')

  const handleSleep = () => publish('renewvan/kiosk/display/power/set', 'off')
  const handleWake = () => publish('renewvan/kiosk/display/power/set', 'on')

  return (
    <div className="dark">
      <SleepOverlay displayPower={displayPower} onWake={handleWake} />
      <div className="page">
        <ConnectionBanner status={status} />
        <Tabs
          activeId={activeTab}
          onSelect={setActiveTab}
          tabs={[
            { id: 'tanks', label: 'Tanks', content: <TanksTab tanks={state.tanks} /> },
            { id: 'power', label: 'Power', content: <PowerTab batteries={state.batteries} /> },
            { id: 'switches', label: 'Switches', content: <SwitchesTab relays={state.relays} /> },
            { id: 'settings', label: 'Settings', content: <SettingsTab onSleep={handleSleep} tailscale={tailscale} /> },
          ]}
        />
      </div>
    </div>
  )
}

export default App
