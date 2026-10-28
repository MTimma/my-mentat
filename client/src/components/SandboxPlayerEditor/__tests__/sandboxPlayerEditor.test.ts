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

  it('puts the name and color under the leader, and deck buttons in the pile grid', () => {
    const leaderAt = editorTsx.indexOf('<LeaderSelect')
    const nameAt = editorTsx.indexOf('sandbox-player-editor__name-row')
    expect(leaderAt).toBeGreaterThan(-1)
    expect(nameAt).toBeGreaterThan(leaderAt)
    const nameRow = editorTsx.slice(nameAt, editorTsx.indexOf('sandbox-player-editor__control-toggles'))
    expect(nameRow).toContain('aria-label="Player color"')
    expect(nameRow).not.toContain('>Color<')
    const buttonsBlock = editorTsx.slice(
      editorTsx.indexOf('sandbox-player-editor__pile-buttons'),
      editorTsx.indexOf('sandbox-player-editor__control-row')
    )
    expect(buttonsBlock).not.toContain('aria-label="Player color"')
    expect(buttonsBlock).toContain('label="Deck"')
    expect(buttonsBlock).toContain('count={player.deck.length}')
    expect(buttonsBlock).toContain('label="Discard"')
    expect(buttonsBlock).toContain('count={player.discardPile.length}')
    expect(buttonsBlock).toContain('label="Trash"')
    expect(buttonsBlock).toContain('count={player.trash.length}')
    expect(editorTsx).toContain('sandbox-player-editor__deck-button-count')
    expect(editorTsx).toContain('sandbox-player-editor__deck-button-edit')
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

  it('keeps leader, name, and close visible and hides the rest behind Advanced setup', () => {
    const leaderAt = editorTsx.indexOf('<LeaderSelect')
    const nameAt = editorTsx.indexOf('sandbox-player-editor__name-row')
    const advancedAt = editorTsx.indexOf('Advanced setup')
    const togglesAt = editorTsx.indexOf('sandbox-player-editor__control-toggles')
    const closeAt = editorTsx.indexOf('sandbox-player-editor__close')
    expect(leaderAt).toBeGreaterThan(-1)
    expect(nameAt).toBeGreaterThan(leaderAt)
    expect(advancedAt).toBeGreaterThan(nameAt)
    expect(closeAt).toBeGreaterThan(advancedAt)
    expect(togglesAt).toBeGreaterThan(closeAt)
    expect(editorTsx).toContain('sandbox-player-editor__actions')
    expect(editorCss).toContain('.sandbox-player-editor__actions')
    expect(editorCss).toContain('border-color: var(--setup-modal-line)')
    expect(editorCss).toContain('outline: none')
    expect(editorTsx).toContain('const [advancedSetup, setAdvancedSetup] = useState(false)')
    expect(editorTsx).toContain('aria-expanded={advancedSetup}')
    expect(editorTsx).toContain('{advancedSetup ? (')
    expect(editorCss).toContain('.sandbox-player-editor__advanced')
  })

  it('uses a wider sandbox leader trigger', () => {
    expect(leaderCss).toContain('.leader-select--sandbox .leader-select__trigger')
    expect(leaderCss).toMatch(/\.leader-select--sandbox \.leader-select__trigger \{[\s\S]*?width:\s*100%/)
  })
})
