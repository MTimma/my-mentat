import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Board decks button wiring', () => {
  const root = resolve(__dirname, '../../..')
  const imageBoard = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.tsx'), 'utf8')
  const anchors = readFileSync(resolve(root, 'data/boardMarkerAnchors.ts'), 'utf8')
  const css = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')
  const piles = readFileSync(resolve(root, 'utils/boardDeckPiles.ts'), 'utf8')

  it('anchors a compact horizontal button at x 25, y 25', () => {
    expect(anchors).toContain('BOARD_DECKS_BUTTON_ANCHOR')
    expect(imageBoard).toContain('BOARD_DECKS_BUTTON_ANCHOR')
    expect(imageBoard).toContain('data-marker="board-decks"')
    expect(imageBoard).toContain('sandbox-session-bar__btn image-board__board-decks-btn')
    expect(imageBoard).toContain('Board decks & discards')
    expect(css).toContain('.image-board__board-decks-btn')
    expect(css).toMatch(/\.image-board__board-decks-btn \{[\s\S]*?white-space:\s*nowrap/)
  })

  it('opens the card-select browser without selection controls', () => {
    const modal = readFileSync(resolve(root, 'components/ImageBoard/BoardDecksModal.tsx'), 'utf8')
    const cardSearch = readFileSync(resolve(root, 'components/CardSearch/CardSearch.tsx'), 'utf8')
    expect(modal).toContain('browseOnly')
    expect(modal).toContain('<CardSearch')
    expect(cardSearch).toContain('browseOnly')
    expect(cardSearch).toMatch(/browseOnly \? \([\s\S]*Close/)
    expect(cardSearch).toContain('!browseOnly && (showSelectionPreview')
  })

  it('opens the shared deck piles, including expansion decks', () => {
    expect(imageBoard).toContain('listBoardDeckPiles(gameStateForMarkers)')
    expect(piles).toContain("id: 'imperium-deck'")
    expect(piles).toContain("id: 'imperium-discard'")
    expect(piles).toContain("id: 'intrigue-deck'")
    expect(piles).toContain("id: 'intrigue-discard'")
    expect(piles).toContain("id: 'conflict-deck'")
    expect(piles).toContain("id: 'conflict-discard'")
    expect(piles).toContain("id: 'tleilaxu-deck'")
    expect(piles).toContain("id: 'tech-deck'")
    expect(piles).toContain('helenaRemovedCard')
  })
})
