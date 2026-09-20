import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { IX_BOARD_HOTSPOTS, isIxOverlaySpaceId } from '../../../data/ixBoardAnchors'

describe('Ix overlay history space highlight', () => {
  const root = resolve(__dirname, '../../..')
  const imageBoard = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.tsx'), 'utf8')
  const overlay = readFileSync(resolve(root, 'components/ImageBoard/IxBoardOverlay.tsx'), 'utf8')
  const overlayCss = readFileSync(resolve(root, 'components/ImageBoard/IxBoardOverlay.css'), 'utf8')
  const boardCss = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')

  it('treats Tech Negotiation and Dreadnought as Ix overlay spaces', () => {
    const ids = IX_BOARD_HOTSPOTS.map(h => h.spaceId)
    expect(ids).toEqual(expect.arrayContaining([23, 24]))
    expect(isIxOverlaySpaceId(23)).toBe(true)
    expect(isIxOverlaySpaceId(24)).toBe(true)
    expect(isIxOverlaySpaceId(25)).toBe(false)
  })

  it('paints the history outline on the Ix overlay for overlay spaces', () => {
    expect(imageBoard).toContain('isIxOverlaySpaceId(historyHighlightSpaceId)')
    expect(imageBoard).toContain('historyHighlightSpaceId={ixHistoryHighlightSpaceId}')
    expect(imageBoard).not.toContain('historyHighlightSpaceId === 23')
    expect(overlay).toContain('className="image-board__history-space-highlight"')
    expect(overlay).toContain('IX_BOARD_HOTSPOTS.filter(h => h.spaceId === historyHighlightSpaceId)')
  })

  it('does not draw Ix overlay history outlines on the main Board.jpg hotspot layer', () => {
    expect(imageBoard).not.toContain('IX_BOARD_HOTSPOTS.find')
    expect(imageBoard).not.toContain('layoutIxLocalRectPercent')
    expect(imageBoard).toContain('ixHistoryHighlightSpaceId == null')
  })

  it('reuses the main-board history outline styling on the Ix layer', () => {
    expect(boardCss).toContain('.image-board__history-space-highlight')
    expect(overlayCss).toContain('.ix-board-overlay__layer .image-board__history-space-highlight')
  })
})
