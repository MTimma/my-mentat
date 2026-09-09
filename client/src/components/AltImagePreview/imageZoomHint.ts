import { isStandaloneDisplay } from '../../pwa/displayMode'

export const IMAGE_ZOOM_HINT = 'Hold Alt/Option to zoom in'

/** Desktop hover only — skip on touch, coarse pointers, and installed PWA. */
export function isImageZoomHintEnabled(): boolean {
  if (typeof window === 'undefined') return false
  if (isStandaloneDisplay()) return false
  try {
    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
  } catch {
    return false
  }
}

export function withImageZoomHint(title?: string | null): string {
  const existing = title?.trim() ?? ''
  if (!isImageZoomHintEnabled()) return existing
  if (!existing) return IMAGE_ZOOM_HINT
  if (existing.includes(IMAGE_ZOOM_HINT)) return existing
  return `${existing}\n${IMAGE_ZOOM_HINT}`
}

export function splitImageZoomHint(title?: string | null): { label: string; hint: string } {
  const combined = withImageZoomHint(title)
  const lines = combined.split('\n')
  const hintIndex = lines.lastIndexOf(IMAGE_ZOOM_HINT)
  if (hintIndex <= 0) return { label: '', hint: IMAGE_ZOOM_HINT }
  return {
    label: lines.slice(0, hintIndex).join('\n'),
    hint: IMAGE_ZOOM_HINT,
  }
}
