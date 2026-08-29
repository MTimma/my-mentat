import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Alt / Option card zoom', () => {
  const root = resolve(__dirname, '../../..')
  const tsx = readFileSync(resolve(root, 'components/AltImagePreview/AltImagePreview.tsx'), 'utf8')
  const css = readFileSync(resolve(root, 'components/AltImagePreview/AltImagePreview.css'), 'utf8')

  it('treats Alt (Windows/Linux) and Option (Mac) as the zoom modifier', () => {
    expect(tsx).toContain("event.key === 'Alt' || event.altKey")
  })

  it('shows a large card preview, not the old 400px cap', () => {
    expect(css).toMatch(/max-width:\s*min\(90vw, 700px\)/)
    expect(css).toMatch(/max-height:\s*min\(88vh, 860px\)/)
    expect(css).not.toMatch(/max-width:\s*min\(88vw, 400px\)/)
  })

  it('includes seat play-area cards in the hover hit targets', () => {
    expect(tsx).toContain("'.birdseye-seat-play-area__card'")
  })
})
