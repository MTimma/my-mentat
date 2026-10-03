import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Conflict discard pile wiring', () => {
  const root = resolve(__dirname, '../../..')
  const imageBoard = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.tsx'), 'utf8')
  const anchors = readFileSync(resolve(root, 'data/boardMarkerAnchors.ts'), 'utf8')
  const appTsx = readFileSync(resolve(root, 'App.tsx'), 'utf8')
  const css = readFileSync(resolve(root, 'components/ImageBoard/ImageBoard.css'), 'utf8')

  it('does not render a conflict discard pile on the board', () => {
    expect(imageBoard).not.toContain('data-marker="conflict-discard"')
    expect(imageBoard).not.toContain('image-board__conflict-discard')
    expect(imageBoard).not.toContain('CONFLICT_DISCARD_RECT')
  })

  it('sandbox setup can edit the discard pile and play can view it', () => {
    expect(appTsx).toContain('SANDBOX_SET_CONFLICTS_DISCARD')
    expect(appTsx).toContain('setSandboxConflictDiscardOpen')
    expect(appTsx).toContain('setConflictDiscardViewOpen')
    expect(appTsx).toContain('Select previous conflict cards')
    expect(appTsx).toContain('isConflictInDiscard')
  })

  it('resets native button padding so the conflict panel is not a mini thumbnail', () => {
    expect(css).toMatch(/button\.image-board__conflict-panel \{[\s\S]*?padding:\s*0/)
    expect(css).toMatch(/\.image-board__conflict-card-img \{[\s\S]*?position:\s*absolute/)
  })
})
