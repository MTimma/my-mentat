export const IMAGE_ZOOM_HINT = 'Hold Alt/Option to zoom in'

export function withImageZoomHint(title?: string | null): string {
  const existing = title?.trim() ?? ''
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
