import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('RoI negotiator cube wiring', () => {
  const root = resolve(__dirname, '../../..')
  const overlay = readFileSync(resolve(root, 'components/ImageBoard/IxBoardOverlay.tsx'), 'utf8')
  const tracker = readFileSync(resolve(root, 'components/ImageBoard/BoardTracker.tsx'), 'utf8')
  const css = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')

  it('draws Ix negotiators with the same cube face as influence trackers', () => {
    expect(overlay).toContain('BoardTrackerCube')
    expect(overlay).toContain('ix-board-overlay__negotiator-square')
    expect(overlay).toContain('count > 1')
    expect(overlay).toContain('x{count}')
    expect(overlay).not.toContain('Math.min(count, 6)')
    expect(tracker).toContain('image-board__tracker-cube')
    expect(tracker).toContain("variant === 'cube'")
    expect(css).toMatch(/\.image-board__tracker,\s*\.image-board__tracker-cube/)
  })
})
