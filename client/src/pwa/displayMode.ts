/** Home-screen / installed PWA — no Safari/Chrome browser chrome. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** F11 / Fullscreen API / OS window fullscreen. Not an installed PWA. */
export function isFullscreenDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(display-mode: fullscreen)').matches
}

/**
 * Installed PWA or OS/page fullscreen — no in-browser URL-bar letterboxing.
 * Desktop fullscreen is not a notch; do not reuse this for the 47px iOS safe-top floor.
 */
export function isFillScreenDisplay(): boolean {
  return isStandaloneDisplay() || isFullscreenDisplay()
}

/** Mark <html> for CSS that cannot rely on display-mode media queries (older iOS). */
export function markStandaloneDisplayMode(): void {
  if (isStandaloneDisplay()) {
    document.documentElement.dataset.displayMode = 'standalone'
  }
}

/**
 * Play layout viewport. In the browser, visualViewport excludes URL/toolbar chrome.
 * Installed PWAs and OS fullscreen should fill the screen; using visualViewport there recreates those gaps.
 */
export function getPlayViewportSize(): { width: number; height: number } {
  const innerW = window.innerWidth
  const innerH = window.innerHeight
  if (isFillScreenDisplay()) {
    return { width: innerW, height: innerH }
  }
  const vv = window.visualViewport
  return {
    width: vv?.width ?? innerW,
    height: vv?.height ?? innerH,
  }
}
