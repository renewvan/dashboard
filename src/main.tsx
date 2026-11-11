import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppToasts } from './components/AppToasts.tsx'
import { WakePage } from './components/wake/WakePage.tsx'
import { LoginPage } from './components/login/LoginPage.tsx'
import { isSignedOut, loginUrl } from './lib/session.ts'
import { registerSW } from 'virtual:pwa-register'
import { applyDevFlags } from './lib/devFlags.ts'

applyDevFlags()

// `/login` is the sign-in page and `?page=wake` the parked-van wake screen. Each is rendered INSTEAD of
// the app, so it opens no broker connection. The wake page needs no hub: it runs from the cached PWA
// shell while the hub is off.
const loginOnly = window.location.pathname === '/login'
const wakeOnly = new URLSearchParams(window.location.search).get('page') === 'wake'

function mount() {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      {loginOnly ? (
        <LoginPage />
      ) : wakeOnly ? (
        <WakePage />
      ) : (
        <>
          <App />
          <AppToasts />
        </>
      )}
    </StrictMode>,
  )
}

// The cached PWA shell opens without asking Caddy, so a signed-out device would boot the app and loop on
// a refused WebSocket. Ask the login service first and send a signed-out visitor to /login. The wake
// page needs no hub and no login, so it skips the check.
if (loginOnly || wakeOnly) {
  mount()
} else {
  void isSignedOut().then((out) => {
    if (out) window.location.replace(loginUrl(window.location.pathname + window.location.search))
    else mount()
  })
}

registerSW({ immediate: true })
