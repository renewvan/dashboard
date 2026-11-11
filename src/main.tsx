import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppToasts } from './components/AppToasts.tsx'
import { WakePage } from './components/wake/WakePage.tsx'
import { registerSW } from 'virtual:pwa-register'
import { applyDevFlags } from './lib/devFlags.ts'

applyDevFlags()

// `?page=wake` is the parked-van wake screen. It is rendered INSTEAD of the app, so it opens no
// broker connection and needs no hub: it runs from the cached PWA shell while the hub is off.
const wakeOnly = new URLSearchParams(window.location.search).get('page') === 'wake'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {wakeOnly ? (
      <WakePage />
    ) : (
      <>
        <App />
        <AppToasts />
      </>
    )}
  </StrictMode>,
)

registerSW({ immediate: true })
