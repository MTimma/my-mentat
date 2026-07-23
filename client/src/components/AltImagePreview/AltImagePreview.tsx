import React, { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import './AltImagePreview.css'

type PreviewState = {
  src: string
  alt: string
  x: number
  y: number
}

/** Containers where hover may hit padding/chrome but a preview image lives inside. */
const PREVIEW_FRAME_SELECTOR = [
  '.turn-card-frame',
  '.turn-history-card-thumb',
  '.turn-gain-card-thumb',
  '.reveal-turn-revealed-card',
  '.reveal-turn-acquired-card',
  '.player-tech-tiles__tile',
  '.tech-tile-flip-badge',
  '.imperium-card',
  '.conflict-card',
  '.conflict-card-image',
  '.tech-market-tile',
  '.tech-tile-select-tile',
  '.ix-board-overlay__tech-slot',
  '.tech-stacks-modal__column',
  '.tech-acquire-modal__stack-slot',
  '.image-board__conflict-panel',
].join(', ')

function isVisiblePreviewTarget(img: HTMLImageElement): boolean {
  const rect = img.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return false

  let node: Element | null = img
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    node = node.parentElement
  }
  return true
}

function pointInRect(x: number, y: number, rect: DOMRect): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

function findPreviewImageFromTarget(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) return null

  const direct = target.closest('[data-preview-src]')
  if (direct instanceof HTMLImageElement) {
    const src = direct.getAttribute('data-preview-src')
    if (src) return direct
  }

  const frame = target.closest(PREVIEW_FRAME_SELECTOR)
  if (frame) {
    const nested = frame.querySelector('img[data-preview-src]')
    if (nested instanceof HTMLImageElement) return nested
  }

  return null
}

/** Hit-test preview images by geometry (works through pointer-events: none ancestors). */
function findPreviewImageAtPoint(x: number, y: number, target: EventTarget | null): HTMLImageElement | null {
  const fromTarget = findPreviewImageFromTarget(target)
  if (fromTarget) {
    const rect = fromTarget.getBoundingClientRect()
    if (pointInRect(x, y, rect) && isVisiblePreviewTarget(fromTarget)) {
      return fromTarget
    }
  }

  let best: HTMLImageElement | null = null
  let bestArea = Infinity
  let bestZ = -Infinity

  document.querySelectorAll<HTMLImageElement>('img[data-preview-src]').forEach(img => {
    if (!isVisiblePreviewTarget(img)) return
    const rect = img.getBoundingClientRect()
    if (!pointInRect(x, y, rect)) return

    const area = rect.width * rect.height
    const z = Number.parseInt(window.getComputedStyle(img).zIndex, 10)
    const zIndex = Number.isFinite(z) ? z : 0

    if (area < bestArea || (area === bestArea && zIndex > bestZ)) {
      best = img
      bestArea = area
      bestZ = zIndex
    }
  })

  return best
}

export function AltImagePreviewProvider({ children }: { children: React.ReactNode }) {
  const [altHeld, setAltHeld] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Alt' || event.altKey) setAltHeld(true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt' || !event.altKey) {
        setAltHeld(false)
        setPreview(null)
      }
    }
    const onBlur = () => {
      setAltHeld(false)
      setPreview(null)
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  const updatePreviewFromEvent = useCallback((event: MouseEvent) => {
    const altActive = altHeld || event.altKey
    if (!altActive) {
      setPreview(null)
      return
    }

    const img = findPreviewImageAtPoint(event.clientX, event.clientY, event.target)
    if (!img) {
      setPreview(null)
      return
    }

    const src = img.getAttribute('data-preview-src') ?? img.src
    setPreview({
      src,
      alt: img.alt || 'Preview',
      x: event.clientX,
      y: event.clientY,
    })
  }, [altHeld])

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      updatePreviewFromEvent(event)
    },
    [updatePreviewFromEvent]
  )

  const handleMouseLeave = useCallback(() => {
    setPreview(null)
  }, [])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [handleMouseLeave, handleMouseMove])

  const panel =
    (altHeld || preview) && preview ? (
      <div
        className="alt-image-preview"
        style={{
          left: Math.min(preview.x + 18, window.innerWidth - 24),
          top: Math.min(preview.y + 18, window.innerHeight - 24),
        }}
        aria-hidden="true"
      >
        <img src={preview.src} alt={preview.alt} className="alt-image-preview__img" draggable={false} />
      </div>
    ) : null

  return (
    <>
      {children}
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </>
  )
}
