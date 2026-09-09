/** Home-screen / installed PWA — no Safari/Chrome browser chrome. */
export function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/** Mark <html> for CSS that cannot rely on display-mode media queries (older iOS). */
export function markStandaloneDisplayMode(): void {
  if (isStandaloneDisplay()) {
    document.documentElement.dataset.displayMode = 'standalone'
  }
}

/**
 * Play layout viewport. In the browser, visualViewport excludes URL/toolbar chrome.
 * Installed PWAs should fill the screen; using visualViewport there recreates those gaps.
 */
export function getPlayViewportSize(): { width: number; height: number } {
  const innerW = window.innerWidth
  const innerH = window.innerHeight
  if (isStandaloneDisplay()) {
    return { width: innerW, height: innerH }
  }
  const vv = window.visualViewport
  return {
    width: vv?.width ?? innerW,
    height: vv?.height ?? innerH,
  }
}
