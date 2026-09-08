import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Sandbox player editor leader row', () => {
  const root = resolve(__dirname, '../')
  const editorTsx = readFileSync(resolve(root, 'SandboxPlayerEditor.tsx'), 'utf8')
  const editorCss = readFileSync(resolve(root, 'SandboxPlayerEditor.css'), 'utf8')
  const leaderCss = readFileSync(resolve(root, '../LeaderSelect/LeaderSelect.css'), 'utf8')

  it('assigns a default leader when the editor opens unassigned', () => {
    expect(editorTsx).toContain('isUnassignedLeader(player.leader)')
    expect(editorTsx).toContain('availableLeaders.find(leader => !usedLeaderNames.includes(leader.name))')
  })

  it('puts color in the 2x2 pile grid with deck buttons', () => {
    const buttonsBlock = editorTsx.slice(
      editorTsx.indexOf('sandbox-player-editor__pile-buttons'),
      editorTsx.indexOf('sandbox-player-editor__pile-count')
    )
    expect(buttonsBlock).toContain('aria-label="Player color"')
    expect(buttonsBlock).toContain('Edit deck')
    expect(buttonsBlock).toContain('Edit discard')
    expect(buttonsBlock).toContain('Edit trash')
    expect(editorCss).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))')
  })

  it('uses a wider sandbox leader trigger', () => {
    expect(leaderCss).toContain('.leader-select--sandbox .leader-select__trigger')
    expect(leaderCss).toMatch(/\.leader-select--sandbox \.leader-select__trigger \{[\s\S]*?width:\s*8rem/)
  })
})
