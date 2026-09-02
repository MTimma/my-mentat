import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Alt / Option card zoom', () => {
  const root = resolve(__dirname, '../../..')
  const tsx = readFileSync(resolve(root, 'components/AltImagePreview/AltImagePreview.tsx'), 'utf8')
  const css = readFileSync(resolve(root, 'components/AltImagePreview/AltImagePreview.css'), 'utf8')

  it('treats Alt (Windows/Linux) and Option (Mac) as the zoom modifier', () => {
    expect(tsx).toContain("event.key !== 'Alt' && !event.altKey")
  })

  it('zooms gains as a full-content clone, not a scaled compact chip', () => {
    expect(tsx).toContain("kind: 'gains'")
    expect(tsx).toContain('findGainZoomTarget')
    expect(tsx).toContain('alt-gain-preview')
    expect(css).toContain('.alt-gain-preview .turn-gain-source-title')
    expect(css).toContain('-webkit-line-clamp: unset')
    expect(css).not.toContain('transform: scale(1.55)')
  })

  it('pins the gains zoom just above the chip, not offset below the cursor', () => {
    expect(tsx).toContain('gainsPreviewPanelStyle')
    expect(tsx).toContain("transform: 'translate(-50%, -100%)'")
    expect(tsx).toContain('anchorTop')
  })

  it('shows a large card preview, not the old 400px cap', () => {
    expect(css).toMatch(/max-width:\s*min\(90vw, 700px\)/)
    expect(css).toMatch(/max-height:\s*min\(88vh, 860px\)/)
    expect(css).not.toMatch(/max-width:\s*min\(88vw, 400px\)/)
  })

  it('includes seat play-area cards in the hover hit targets', () => {
    expect(tsx).toContain("'.birdseye-seat-play-area__card'")
  })

  it('zooms on Alt / Option keydown without requiring a mouse move', () => {
    expect(tsx).toContain('pointerRef')
    expect(tsx).toContain('document.elementFromPoint')
    expect(tsx).toContain('if (event.repeat) return')
    expect(tsx).toContain('applyPreview(x, y, document.elementFromPoint(x, y), true)')
  })
})
