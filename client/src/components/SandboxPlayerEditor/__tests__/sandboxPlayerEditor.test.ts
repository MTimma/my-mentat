import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Sandbox player editor leader row', () => {
  const root = resolve(__dirname, '../')
  const editorTsx = readFileSync(resolve(root, 'SandboxPlayerEditor.tsx'), 'utf8')
  const editorCss = readFileSync(resolve(root, 'SandboxPlayerEditor.css'), 'utf8')
  const leaderCss = readFileSync(resolve(root, '../LeaderSelect/LeaderSelect.css'), 'utf8')

  it('shows the saved player name in an editable header', () => {
    const fieldTsx = readFileSync(resolve(root, '../QuietNameField/QuietNameField.tsx'), 'utf8')
    const fieldCss = readFileSync(resolve(root, '../QuietNameField/QuietNameField.css'), 'utf8')
    expect(editorTsx).toContain('savedPlayerName(player)')
    expect(editorTsx).toContain('ariaLabel="Player name"')
    expect(editorTsx).toContain('<QuietNameField')
    expect(editorTsx).not.toContain('Player {player.id + 1} setup')
    expect(fieldTsx).toContain('quiet-name-field')
    expect(fieldCss).toContain('background: transparent')
  })

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

  it('adds Immortality Tleilaxu and research controls in leader setup', () => {
    expect(editorTsx).toContain('expansions.immortality')
    expect(editorTsx).toContain('TLEILAXU_TRACK_MAX_STEP')
    expect(editorTsx).toContain('/icon/tleilaxu.png')
    expect(editorTsx).toContain('/icon/specimen.png')
    expect(editorTsx).toContain('MAX_TROOPS_PER_PLAYER')
    expect(editorTsx).toContain('aria-label="Set research track"')
    expect(editorTsx).toContain('choiceNodeIds={RESEARCH_NODE_IDS}')
    expect(editorTsx).toContain('showChoiceLabels={false}')
    expect(editorTsx).toContain('researchNodeId: nodeId')
    expect(editorCss).toContain('.sandbox-player-editor__research-pick')
  })

  it('uses a wider sandbox leader trigger', () => {
    expect(leaderCss).toContain('.leader-select--sandbox .leader-select__trigger')
    expect(leaderCss).toMatch(/\.leader-select--sandbox \.leader-select__trigger \{[\s\S]*?width:\s*8rem/)
  })
})
