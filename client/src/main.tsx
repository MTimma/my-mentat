import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './polyfills/cryptoRandomUUID'
import '@fontsource/ibm-plex-sans/latin-400.css'
import '@fontsource/ibm-plex-sans/latin-500.css'
import '@fontsource/ibm-plex-sans/latin-600.css'
import '@fontsource/ibm-plex-sans/latin-700.css'
import './index.css'
import './theme-arrakis-sun.css'
import { preloadBoardImages } from './bootstrap/preloadBoardImages'
import { preloadDeckCardImages } from './bootstrap/preloadDeckCardImages'
import { bootstrapGamePacks } from './bootstrap/bootstrapGamePacks'
import { preloadIntrigueCardImages } from './bootstrap/preloadIntrigueCardImages'
import { markStandaloneDisplayMode } from './pwa/displayMode'
import { applyPlayChromeTheme, getPlayChromeTheme } from './utils/playChromeTheme'
import App from './App.tsx'

markStandaloneDisplayMode()
applyPlayChromeTheme(getPlayChromeTheme())
preloadBoardImages()
preloadIntrigueCardImages()
preloadDeckCardImages()

void bootstrapGamePacks().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
})
