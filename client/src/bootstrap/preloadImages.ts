const injectedImageUrls = new Set<string>()

/** Inject `<link rel="preload" as="image">` tags during idle time so modals don't flash empty art. */
export function schedulePreloadImageUrls(urls: readonly string[]): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const inject = () => {
    for (const href of urls) {
      if (!href || injectedImageUrls.has(href)) continue
      injectedImageUrls.add(href)
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = href
      link.dataset.preloadImage = href
      document.head.appendChild(link)
    }
  }

  const ric = window.requestIdleCallback
  if (typeof ric === 'function') {
    ric(() => inject(), { timeout: 5000 })
  } else {
    window.setTimeout(inject, 100)
  }
}
