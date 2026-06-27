const warmedImageUrls = new Set<string>()

/** Warm image HTTP cache during idle time so modals don't flash empty art. */
export function schedulePreloadImageUrls(urls: readonly string[]): void {
  if (typeof window === 'undefined') return

  const warm = () => {
    for (const href of urls) {
      if (!href || warmedImageUrls.has(href)) continue
      warmedImageUrls.add(href)
      const img = new Image()
      img.src = href
    }
  }

  const ric = window.requestIdleCallback
  if (typeof ric === 'function') {
    ric(() => warm(), { timeout: 5000 })
  } else {
    window.setTimeout(warm, 100)
  }
}
