import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Force update tab icon for Safari and Chromium
try {
  const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
  link.setAttribute('rel', 'shortcut icon')
  link.setAttribute('type', 'image/png')
  link.setAttribute('href', `/logo2.png?v=${Date.now()}`)
  document.head.appendChild(link)
} catch {
  // ignore
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
