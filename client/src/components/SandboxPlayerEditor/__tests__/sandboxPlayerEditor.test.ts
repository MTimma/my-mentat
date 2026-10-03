import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('Sandbox player editor leader row', () => {
  const root = resolve(__dirname, '../')
  const editorTsx = readFileSync(resolve(root, 'SandboxPlayerEditor.tsx'), 'utf8')
  const editorCss = readFileSync(resolve(root, 'SandboxPlayerEditor.css'), 'utf8')
  const leaderCss = readFileSync(resolve(root, '../LeaderSelect/LeaderSelect.css'), 'utf8')

  it('shows a labeled player name field that stays empty until Begin', () => {
    expect(editorTsx).toContain('Player name')
    expect(editorTsx).toContain('placeholder="Empty will use leader name"')
    expect(editorTsx).toContain('htmlFor="sandbox-player-name"')
    expect(editorTsx).not.toContain('<QuietNameField')
    expect(editorTsx).not.toContain('sandbox-player-editor-title')
    expect(editorCss).toContain('.sandbox-player-editor__name-label')
    expect(editorCss).toContain('.sandbox-player-editor__name-input::placeholder')
  })

  it('assigns a default leader when the editor opens unassigned', () => {
    expect(editorTsx).toContain('isUnassignedLeader(player.leader)')
    expect(editorTsx).toContain('availableLeaders.find(leader => !usedLeaderNames.includes(leader.name))')
  })

  it('puts color beside the player name and deck buttons in the pile grid', () => {
    const nameRow = editorTsx.slice(
      editorTsx.indexOf('sandbox-player-editor__name-row'),
      editorTsx.indexOf('sandbox-player-editor__leader-row')
    )
    expect(nameRow).toContain('aria-label="Player color"')
    expect(nameRow).not.toContain('>Color<')
    const buttonsBlock = editorTsx.slice(
      editorTsx.indexOf('sandbox-player-editor__pile-buttons'),
      editorTsx.indexOf('sandbox-player-editor__control-row')
    )
    expect(buttonsBlock).not.toContain('aria-label="Player color"')
    expect(buttonsBlock).toContain('Edit deck {player.deck.length}')
    expect(buttonsBlock).toContain('Edit discard {player.discardPile.length}')
    expect(buttonsBlock).toContain('Edit trash {player.trash.length}')
    expect(buttonsBlock).not.toContain('sandbox-player-editor__pile-count')
    expect(editorTsx).toContain('Board control')
    expect(editorCss).toContain('.sandbox-player-editor__pile-buttons')
    expect(editorCss).toContain('display: flex')
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
    expect(leaderCss).toMatch(/\.leader-select--sandbox \.leader-select__trigger \{[\s\S]*?width:\s*100%/)
  })
})
