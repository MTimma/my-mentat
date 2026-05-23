          import { RefObject, useLayoutEffect } from 'react'

type UseVisualViewportOverlayOptions = {
  enabled: boolean
  /** Prevent the page behind the overlay from scrolling (recommended on iOS). */
  lockDocumentScroll?: boolean
}

/**
 * Pins a fixed overlay to window.visualViewport so it stays above the iOS software keyboard
 * instead of using the layout viewport (which extends under the keyboard).
 */
export function useVisualViewportOverlay(
  overlayRef: RefObject<HTMLElement | null>,
  { enabled, lockDocumentScroll = true }: UseVisualViewportOverlayOptions
) {
  useLayoutEffect(() => {
    if (!enabled) return

    const overlay = overlayRef.current
    const vv = window.visualViewport
    if (!overlay || !vv) return

    overlay.classList.add('vv-overlay-anchored')

    let lockedScrollY = 0
    const previousBody = {
      overflow: document.body.style.overflow,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }

    if (lockDocumentScroll) {
      lockedScrollY = window.scrollY
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${lockedScrollY}px`
      document.body.style.width = '100%'
    }

    let frame = 0
    const apply = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport
        const node = overlayRef.current
        if (!viewport || !node) return

        node.style.top = `${viewport.offsetTop}px`
        node.style.left = `${viewport.offsetLeft}px`
        node.style.width = `${viewport.width}px`
        node.style.height = `${viewport.height}px`
      })
    }

    apply()
    vv.addEventListener('resize', apply)
    vv.addEventListener('scroll', apply)
    window.addEventListener('resize', apply)
    window.addEventListener('orientationchange', apply)

    return () => {
      cancelAnimationFrame(frame)
      vv.removeEventListener('resize', apply)
      vv.removeEventListener('scroll', apply)
      window.removeEventListener('resize', apply)
      window.removeEventListener('orientationchange', apply)

      overlay.classList.remove('vv-overlay-anchored')
      overlay.style.removeProperty('top')
      overlay.style.removeProperty('left')
      overlay.style.removeProperty('width')
      overlay.style.removeProperty('height')

      if (lockDocumentScroll) {
        document.body.style.overflow = previousBody.overflow
        document.body.style.position = previousBody.position
        document.body.style.top = previousBody.top
        document.body.style.width = previousBody.width
        window.scrollTo(0, lockedScrollY)
      }
    }
  }, [enabled, lockDocumentScroll, overlayRef])
}
