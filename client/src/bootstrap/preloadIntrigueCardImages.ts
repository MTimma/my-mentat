import { intrigueCards } from '../services/IntrigueDeckService'

const INTRIGUE_IMAGE_URLS = [...new Set(intrigueCards.map(c => c.image).filter(Boolean))]


export function preloadIntrigueCardImages(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  const inject = () => {
    for (const href of INTRIGUE_IMAGE_URLS) {
      if (document.querySelector(`link[data-preload-intrigue-card="${href}"]`)) continue
      const link = document.createElement('link')
      link.rel = 'preload'
      link.as = 'image'
      link.href = href
      link.dataset.preloadIntrigueCard = href
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
