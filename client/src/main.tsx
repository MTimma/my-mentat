import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polyfills/cryptoRandomUUID'
import './index.css'
import './theme-arrakis-sun.css'
import { preloadIntrigueCardImages } from './bootstrap/preloadIntrigueCardImages'
import App from './App.tsx'

preloadIntrigueCardImages()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
