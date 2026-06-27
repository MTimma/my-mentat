import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polyfills/cryptoRandomUUID'
import './index.css'
import './theme-arrakis-sun.css'
import { applyPlayChromeTheme, getPlayChromeTheme } from './utils/playChromeTheme'
import { preloadDeckCardImages } from './bootstrap/preloadDeckCardImages'
import { bootstrapGamePacks } from './bootstrap/bootstrapGamePacks'
import { preloadIntrigueCardImages } from './bootstrap/preloadIntrigueCardImages'
import App from './App.tsx'

applyPlayChromeTheme(getPlayChromeTheme())
preloadIntrigueCardImages()
preloadDeckCardImages()

void bootstrapGamePacks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
