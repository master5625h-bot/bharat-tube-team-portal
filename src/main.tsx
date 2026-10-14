import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

// Remove the free-plan hosting badge iframe if the host injects it after load
const killBadge = () => document.querySelectorAll('#nl-badge-frame, iframe[title="Powered by Netlify"]').forEach(e => e.remove())
killBadge()
new MutationObserver(killBadge).observe(document.body, { childList: true })
