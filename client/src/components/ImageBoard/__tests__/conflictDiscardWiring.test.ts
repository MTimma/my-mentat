import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Conflict discard pile wiring', () => {
  const root = resolve(__dirname, '../../..')
  const imageBoard = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.tsx'), 'utf8')
  const anchors = readFileSync(resolve(root, 'data/boardMarkerAnchors.ts'), 'utf8')
  const appTsx = readFileSync(resolve(root, 'App.tsx'), 'utf8')
  const css = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')

  it('places the discard pile to the right of the current conflict card', () => {
    expect(anchors).toContain('CONFLICT_DISCARD_RECT')
    expect(anchors).toMatch(/CONFLICT_CARD_RECT\.left \+ CONFLICT_CARD_RECT\.width/)
    expect(imageBoard).toContain('CONFLICT_DISCARD_RECT')
    expect(imageBoard).toContain('data-marker="conflict-discard"')
    expect(imageBoard).toContain('onConflictDiscardClick')
    expect(anchors).toMatch(/width:\s*CONFLICT_CARD_RECT\.width/)
    expect(anchors).toMatch(/height:\s*CONFLICT_CARD_RECT\.height/)
  })

  it('sandbox setup can edit the discard pile and play can view it', () => {
    expect(appTsx).toContain('SANDBOX_SET_CONFLICTS_DISCARD')
    expect(appTsx).toContain('setSandboxConflictDiscardOpen')
    expect(appTsx).toContain('setConflictDiscardViewOpen')
    expect(appTsx).toContain('Select previous conflict cards')
    expect(appTsx).toContain('isConflictInDiscard')
  })

  it('shows a count badge on the discard pile', () => {
    expect(css).toContain('.image-board__conflict-discard-count')
    expect(imageBoard).toContain('image-board__conflict-discard-count')
  })

  it('tints the previous-conflicts slot when the pile has cards', () => {
    expect(imageBoard).toContain("discardCount > 0 ? 'image-board__conflict-discard--filled' : ''")
    expect(css).toContain('.image-board__conflict-discard--filled')
  })

  it('resets native button padding so play-mode discard is not a mini thumbnail', () => {
    expect(css).toMatch(/button\.image-board__conflict-panel \{[\s\S]*?padding:\s*0/)
    expect(css).toMatch(/\.image-board__conflict-card-img \{[\s\S]*?position:\s*absolute/)
  })
})
