import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { isImageZoomHintEnabled, splitImageZoomHint, withImageZoomHint } from './imageZoomHint'
import './AltImagePreview.css'

type ImagePreviewState = {
  kind: 'image'
  src: string
  alt: string
  x: number
  y: number
}

type GainsPreviewState = {
  kind: 'gains'
  html: string
  x: number
  y: number
  anchorTop: number
  anchorBottom: number
  anchorLeft: number
  anchorRight: number
}

type PreviewState = ImagePreviewState | GainsPreviewState

type ZoomHintState = {
  label: string
  hint: string
  x: number
  y: number
}

const ZOOM_HINT_DELAY_MS = 400
const TITLE_BACKUP_ATTR = 'data-zoom-title-backup'

const GAIN_ZOOM_GROUP_SELECTOR = '.turn-gain-source-group, .turn-gain-totals-group'

/** Acquired card titles zoom to the full card, even when nested in a gain chip. */
const CARD_TITLE_ZOOM_SELECTOR = '.turn-gain-card-title, .reveal-turn-acquired-card'

/** Containers where hover may hit padding/chrome but a preview image lives inside. */
const PREVIEW_FRAME_SELECTOR = [
  '.birdseye-seat-play-area__card',
  '.turn-card-frame',
  '.turn-history-card-thumb',
  '.turn-gain-card-thumb',
  '.turn-gain-card-title',
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

function setAltPreviewHeld(held: boolean) {
  document.documentElement.classList.toggle('alt-preview-held', held)
}

function findGainZoomTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null
  const group = target.closest(GAIN_ZOOM_GROUP_SELECTOR)
  if (group instanceof HTMLElement) return group
  const root = target.closest('.turn-gains-display-root')
  if (root instanceof HTMLElement) return root
  const seat = target.closest('.birdseye-seat-gains')
  if (seat instanceof HTMLElement) {
    const inner = seat.querySelector('.turn-gains-display-root')
    if (inner instanceof HTMLElement) return inner
  }
  return null
}

function findCardTitlePreviewImage(target: EventTarget | null): HTMLImageElement | null {
  if (!(target instanceof Element)) return null
  const frame = target.closest(CARD_TITLE_ZOOM_SELECTOR)
  if (!frame) return null
  const img = frame.querySelector('img[data-preview-src]')
  return img instanceof HTMLImageElement && isVisiblePreviewTarget(img) ? img : null
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

function findTitleHost(img: HTMLImageElement): Element {
  if (img.getAttribute('title') || img.hasAttribute(TITLE_BACKUP_ATTR)) return img
  const frame = img.closest(PREVIEW_FRAME_SELECTOR)
  let node: Element | null = img.parentElement
  while (node && node !== document.body) {
    if (node.getAttribute('title') || node.hasAttribute(TITLE_BACKUP_ATTR)) return node
    if (frame && node === frame) break
    node = node.parentElement
  }
  return frame ?? img
}

function ensureZoomHintTitle(img: HTMLImageElement) {
  const host = findTitleHost(img)
  const current = host.getAttribute(TITLE_BACKUP_ATTR) ?? host.getAttribute('title')
  const next = withImageZoomHint(current)
  if (host.getAttribute(TITLE_BACKUP_ATTR)) {
    if (host.getAttribute(TITLE_BACKUP_ATTR) !== next) {
      host.setAttribute(TITLE_BACKUP_ATTR, next)
    }
    return host
  }
  if (host.getAttribute('title') !== next) {
    host.setAttribute('title', next)
  }
  return host
}

function suppressNativeTitle(host: Element) {
  if (host.hasAttribute(TITLE_BACKUP_ATTR)) return
  const current = host.getAttribute('title')
  if (current == null) return
  host.setAttribute(TITLE_BACKUP_ATTR, current)
  host.removeAttribute('title')
}

function restoreNativeTitle(host: Element | null) {
  if (!host) return
  const backup = host.getAttribute(TITLE_BACKUP_ATTR)
  if (backup == null) return
  host.setAttribute('title', backup)
  host.removeAttribute(TITLE_BACKUP_ATTR)
}

function collectTitledAncestors(img: HTMLImageElement): Element[] {
  const hosts: Element[] = []
  const frame = img.closest(PREVIEW_FRAME_SELECTOR)
  let node: Element | null = img
  while (node && node !== document.body) {
    if (node.getAttribute('title') || node.hasAttribute(TITLE_BACKUP_ATTR)) {
      hosts.push(node)
    }
    if (frame && node === frame) break
    node = node.parentElement
  }
  return hosts
}

function zoomHintPanelStyle(hint: ZoomHintState): React.CSSProperties {
  const pad = 8
  const left = Math.min(hint.x + 14, window.innerWidth - pad - 160)
  const top = Math.min(hint.y + 18, window.innerHeight - pad - 48)
  return { left: Math.max(pad, left), top: Math.max(pad, top) }
}

function cardPreviewPanelStyle(x: number, y: number): React.CSSProperties {
  const pad = 12
  const maxW = Math.min(window.innerWidth * 0.92, 720)
  const maxH = window.innerHeight * 0.9
  let left = x + 20
  let top = y + 16
  if (left + maxW > window.innerWidth - pad) {
    left = Math.max(pad, x - maxW - 16)
  }
  if (top + maxH > window.innerHeight - pad) {
    top = Math.max(pad, window.innerHeight - maxH - pad)
  }
  return { left, top }
}

/** Sit just above the gain chip / cursor; flip below if the top edge is tight. */
function gainsPreviewPanelStyle(preview: GainsPreviewState): React.CSSProperties {
  const pad = 8
  const gap = 6
  const maxW = Math.min(window.innerWidth * 0.92, 420)
  const centerX = (preview.anchorLeft + preview.anchorRight) / 2 || preview.x
  const half = maxW / 2
  const left = Math.min(
    Math.max(pad + half, centerX),
    window.innerWidth - pad - half
  )
  const spaceAbove = preview.anchorTop - pad
  const placeAbove = spaceAbove >= 72
  if (placeAbove) {
    return {
      left,
      top: preview.anchorTop - gap,
      transform: 'translate(-50%, -100%)',
    }
  }
  return {
    left,
    top: preview.anchorBottom + gap,
    transform: 'translate(-50%, 0)',
  }
}

function previewPanelStyle(preview: PreviewState): React.CSSProperties {
  return preview.kind === 'gains'
    ? gainsPreviewPanelStyle(preview)
    : cardPreviewPanelStyle(preview.x, preview.y)
}

function resolvePreview(
  x: number,
  y: number,
  target: EventTarget | null
): PreviewState | null {
  const fromPoint = document.elementFromPoint(x, y)
  const titleImg = findCardTitlePreviewImage(target) ?? findCardTitlePreviewImage(fromPoint)
  if (titleImg) {
    return {
      kind: 'image',
      src: titleImg.getAttribute('data-preview-src') ?? titleImg.src,
      alt: titleImg.alt || 'Preview',
      x,
      y,
    }
  }

  const gainEl = findGainZoomTarget(target) ?? findGainZoomTarget(fromPoint)
  if (gainEl) {
    const rect = gainEl.getBoundingClientRect()
    return {
      kind: 'gains',
      html: gainEl.outerHTML,
      x,
      y,
      anchorTop: rect.top,
      anchorBottom: rect.bottom,
      anchorLeft: rect.left,
      anchorRight: rect.right,
    }
  }

  const img = findPreviewImageAtPoint(x, y, target ?? fromPoint)
  if (!img) return null
  return {
    kind: 'image',
    src: img.getAttribute('data-preview-src') ?? img.src,
    alt: img.alt || 'Preview',
    x,
    y,
  }
}

export function AltImagePreviewProvider({ children }: { children: React.ReactNode }) {
  const [altHeld, setAltHeld] = useState(false)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [zoomHint, setZoomHint] = useState<ZoomHintState | null>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const hintTimerRef = useRef<number | null>(null)
  const hintHostRef = useRef<Element | null>(null)
  const suppressedTitlesRef = useRef<Element[]>([])
  const hintShownRef = useRef(false)

  const clearZoomHint = useCallback(() => {
    if (hintTimerRef.current != null) {
      window.clearTimeout(hintTimerRef.current)
      hintTimerRef.current = null
    }
    restoreNativeTitle(hintHostRef.current)
    suppressedTitlesRef.current.forEach(restoreNativeTitle)
    suppressedTitlesRef.current = []
    hintHostRef.current = null
    hintShownRef.current = false
    setZoomHint(null)
  }, [])

  const applyPreview = useCallback((x: number, y: number, target: EventTarget | null, altActive: boolean) => {
    if (!altActive) {
      setPreview(null)
      return
    }
    setPreview(resolvePreview(x, y, target))
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Alt' && !event.altKey) return
      setAltPreviewHeld(true)
      setAltHeld(true)
      clearZoomHint()
      if (event.repeat) return
      const { x, y } = pointerRef.current
      applyPreview(x, y, document.elementFromPoint(x, y), true)
    }
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt' || !event.altKey) {
        setAltPreviewHeld(false)
        setAltHeld(false)
        setPreview(null)
      }
    }
    const onBlur = () => {
      setAltPreviewHeld(false)
      setAltHeld(false)
      setPreview(null)
      clearZoomHint()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      setAltPreviewHeld(false)
    }
  }, [applyPreview, clearZoomHint])

  useEffect(() => {
    if (!isImageZoomHintEnabled()) return

    const onMouseMove = (event: MouseEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      const altActive = altHeld || event.altKey
      const img = findPreviewImageAtPoint(event.clientX, event.clientY, event.target)
      if (!img || altActive) {
        if (hintHostRef.current) clearZoomHint()
        applyPreview(event.clientX, event.clientY, event.target, altActive)
        return
      }

      const host = ensureZoomHintTitle(img)
      if (hintHostRef.current !== host) {
        restoreNativeTitle(hintHostRef.current)
        suppressedTitlesRef.current.forEach(restoreNativeTitle)
        suppressedTitlesRef.current = []
        hintHostRef.current = host
        hintShownRef.current = false
        setZoomHint(null)
        if (hintTimerRef.current != null) {
          window.clearTimeout(hintTimerRef.current)
          hintTimerRef.current = null
        }
      }
      suppressNativeTitle(host)
      collectTitledAncestors(img).forEach(node => {
        suppressNativeTitle(node)
        if (!suppressedTitlesRef.current.includes(node)) {
          suppressedTitlesRef.current.push(node)
        }
      })
      if (!hintShownRef.current && hintTimerRef.current == null) {
        const title = host.getAttribute(TITLE_BACKUP_ATTR) ?? host.getAttribute('title')
        const parts = splitImageZoomHint(title)
        hintTimerRef.current = window.setTimeout(() => {
          hintTimerRef.current = null
          hintShownRef.current = true
          setZoomHint({
            ...parts,
            x: pointerRef.current.x,
            y: pointerRef.current.y,
          })
        }, ZOOM_HINT_DELAY_MS)
      }

      applyPreview(event.clientX, event.clientY, event.target, false)
    }
    const onMouseLeave = () => {
      setPreview(null)
      clearZoomHint()
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseleave', onMouseLeave)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseleave', onMouseLeave)
      clearZoomHint()
    }
  }, [altHeld, applyPreview, clearZoomHint])

  const panel =
    (altHeld || preview) && preview ? (
      <div
        className={[
          'alt-image-preview',
          preview.kind === 'gains' ? 'alt-image-preview--gains' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        style={previewPanelStyle(preview)}
        aria-hidden="true"
      >
        {preview.kind === 'gains' ? (
          <div
            className="alt-gain-preview"
            dangerouslySetInnerHTML={{ __html: preview.html }}
          />
        ) : (
          <img src={preview.src} alt={preview.alt} className="alt-image-preview__img" draggable={false} />
        )}
      </div>
    ) : null

  const hintPanel =
    !preview && zoomHint ? (
      <div className="alt-image-zoom-hint" style={zoomHintPanelStyle(zoomHint)} aria-hidden="true">
        {zoomHint.label ? <span className="alt-image-zoom-hint__label">{zoomHint.label}</span> : null}
        <span className="alt-image-zoom-hint__hint">{zoomHint.hint}</span>
      </div>
    ) : null

  return (
    <>
      {children}
      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
      {typeof document !== 'undefined' && hintPanel ? createPortal(hintPanel, document.body) : null}
    </>
  )
}
