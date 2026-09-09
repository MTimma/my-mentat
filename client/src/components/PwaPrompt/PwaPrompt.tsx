import { useCallback, useEffect, useState } from 'react'
import { COMPACT_PLAY_OVERLAY_MQ } from '../../constants/playLayout'
import { isStandaloneDisplay } from '../../pwa/displayMode'
import { registerPwa } from '../../pwa/registerPwa'
import './PwaPrompt.css'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isMobileInstallSurface(): boolean {
  return window.matchMedia(COMPACT_PLAY_OVERLAY_MQ).matches
}

const PwaPrompt = () => {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showUpdate, setShowUpdate] = useState(false)
  const [isMobile, setIsMobile] = useState(isMobileInstallSurface)
  const [reloadApp, setReloadApp] = useState<(() => void) | null>(null)

  useEffect(() => {
    const mq = window.matchMedia(COMPACT_PLAY_OVERLAY_MQ)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (isStandaloneDisplay()) return

    const onBeforeInstallPrompt = (event: Event) => {
      if (!isMobileInstallSurface()) return
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setShowInstall(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  }, [])

  useEffect(() => {
    registerPwa(reload => {
      setReloadApp(() => reload)
      setShowUpdate(true)
    })
  }, [])

  const handleInstall = useCallback(async () => {
    if (!installEvent) return
    await installEvent.prompt()
    const { outcome } = await installEvent.userChoice
    if (outcome === 'accepted') {
      setShowInstall(false)
    }
    setInstallEvent(null)
  }, [installEvent])

  const dismissInstall = useCallback(() => {
    setShowInstall(false)
    setInstallEvent(null)
  }, [])

  const dismissUpdate = useCallback(() => {
    setShowUpdate(false)
  }, [])

  const showInstallBanner = showInstall && isMobile

  if (!showInstallBanner && !showUpdate) return null

  return (
    <div className="pwa-prompt" role="status" aria-live="polite">
      {showUpdate && (
        <div className="pwa-prompt__card">
          <p className="pwa-prompt__text">A new version of Mentarium is ready.</p>
          <div className="pwa-prompt__actions">
            <button type="button" className="pwa-prompt__primary" onClick={() => reloadApp?.()}>
              Reload
            </button>
            <button type="button" className="pwa-prompt__secondary" onClick={dismissUpdate}>
              Later
            </button>
          </div>
        </div>
      )}
      {showInstallBanner && !showUpdate && (
        <div className="pwa-prompt__card pwa-prompt__card--install">
          <p className="pwa-prompt__text">Install Mentarium for quick access from your home screen.</p>
          <div className="pwa-prompt__actions">
            <button type="button" className="pwa-prompt__primary" onClick={handleInstall}>
              Install
            </button>
            <button type="button" className="pwa-prompt__secondary" onClick={dismissInstall}>
              Not now
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default PwaPrompt
