import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toast } from '@heroui/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* `top end`, offset below the header (App.tsx publishes its height) so persistent alerts never cover the header controls. */}
    <Toast.Provider
      placement="top end"
      maxVisibleToasts={6}
      style={{ top: 'calc(var(--app-header-height, 0px) + 0.5rem)' }}
    />
  </StrictMode>,
)
