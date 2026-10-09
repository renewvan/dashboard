import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppToasts } from './components/AppToasts.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <AppToasts />
  </StrictMode>,
)
