import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polyfills/cryptoRandomUUID'
import './index.css'
import './theme-arrakis-sun.css'
import { preloadDeckCardImages } from './bootstrap/preloadDeckCardImages'
import { preloadIntrigueCardImages } from './bootstrap/preloadIntrigueCardImages'
import App from './App.tsx'

preloadIntrigueCardImages()
preloadDeckCardImages()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
