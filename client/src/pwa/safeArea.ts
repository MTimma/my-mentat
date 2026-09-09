import { isStandaloneDisplay, markStandaloneDisplayMode } from './displayMode'

/** Floor when iOS PWA reports env(safe-area-inset-top) as 0 (status bar / Dynamic Island). */
const MIN_STANDALONE_TOP_PX = 44

function measureSafeAreaTopPx(): number {
  const el = document.createElement('div')
  el.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:env(safe-area-inset-top);visibility:hidden;pointer-events:none;'
  document.documentElement.appendChild(el)
  const px = el.getBoundingClientRect().height
  el.remove()
  return px
}

export function refreshPwaSafeAreaInsets(): void {
  if (!isStandaloneDisplay()) {
    document.documentElement.style.removeProperty('--pwa-safe-top')
    return
  }
  const measured = measureSafeAreaTopPx()
  const top = Math.max(measured, MIN_STANDALONE_TOP_PX)
  document.documentElement.style.setProperty('--pwa-safe-top', `${top}px`)
}

/** Installed PWA: reserve top inset below notch / status bar (JS + CSS). */
export function installPwaSafeAreaInsets(): void {
  markStandaloneDisplayMode()

  const apply = () => {
    if (isStandaloneDisplay()) {
      document.body.classList.add('pwa-standalone')
      refreshPwaSafeAreaInsets()
      return
    }
    document.body.classList.remove('pwa-standalone')
    document.documentElement.style.removeProperty('--pwa-safe-top')
  }

  apply()
  window.addEventListener('resize', apply)
  window.addEventListener('orientationchange', apply)
}
