import { useState } from 'react'
import { ConnectionBanner } from './components/ConnectionBanner'
import { Tabs } from './components/Tabs'
import { useRenewvanBus } from './hooks/useRenewvanBus'
import { PowerTab } from './tabs/PowerTab'
import { SwitchesTab } from './tabs/SwitchesTab'
import { TanksTab } from './tabs/TanksTab'

function App() {
  const { state, status } = useRenewvanBus()
  const [activeTab, setActiveTab] = useState('tanks')

  return (
    <div className="page">
      <ConnectionBanner status={status} />
      <Tabs
        activeId={activeTab}
        onSelect={setActiveTab}
        tabs={[
          { id: 'tanks', label: 'Tanks', content: <TanksTab tanks={state.tanks} /> },
          { id: 'power', label: 'Power', content: <PowerTab batteries={state.batteries} /> },
          { id: 'switches', label: 'Switches', content: <SwitchesTab relays={state.relays} /> },
        ]}
      />
    </div>
  )
}

export default App
