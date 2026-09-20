import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Suppress console data/logs so that only errors remain visible in the browser console
if (typeof window !== 'undefined') {
  const noop = () => {};
  console.log = noop;
  console.info = noop;
  console.warn = noop;
  console.debug = noop;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
