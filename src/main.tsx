import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toast } from '@heroui/react'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toast.Provider placement="top end" maxVisibleToasts={6} />
  </StrictMode>,
)
