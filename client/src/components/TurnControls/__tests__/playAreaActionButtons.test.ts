import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Play-area action buttons: compact graphics, Play/Reveal on the top line,
 * tech opens the shared PlayerTechModal instead of inline tiles.
 */
describe('Play area action buttons', () => {
  const root = resolve(__dirname, '../../..')
  const turnControls = readFileSync(
    resolve(root, 'components/TurnControls/TurnControls.tsx'),
    'utf8'
  )
  const turnCss = readFileSync(resolve(root, 'components/TurnControls/TurnControls.css'), 'utf8')
  const appCss = readFileSync(resolve(root, 'App.css'), 'utf8')
  const techModal = readFileSync(
    resolve(root, 'components/PlayerTechModal/PlayerTechModal.tsx'),
    'utf8'
  )
  const seatChrome = readFileSync(
    resolve(root, 'components/ImageBoard/CombatSeatTurnChrome.tsx'),
    'utf8'
  )

  it('puts Play and Reveal labels on the top line of the button', () => {
    const playIdx = turnControls.indexOf('renderPlayCardPlaceholder')
    const playBlock = turnControls.slice(playIdx, playIdx + 900)
    expect(playBlock).toContain('selected-card-action-label--play">{actionLabel}')
    const revealIdx = turnControls.indexOf('selected-card-action-placeholder--reveal')
    const revealBlock = turnControls.slice(revealIdx, revealIdx + 700)
    expect(revealBlock.indexOf('selected-card-action-label--play">Reveal')).toBeLessThan(
      revealBlock.indexOf('RevealCardsIcon')
    )
    expect(turnCss).toMatch(
      /\.selected-card-action-label--play \{[\s\S]*?white-space:\s*nowrap/
    )
    expect(turnCss).toMatch(
      /\.selected-card-action-placeholder--reveal \.selected-card-action-reveal-cards \{[\s\S]*?top:\s*1\.15em/
    )
  })

  it('keeps overlay play-button graphics inside the slot', () => {
    expect(appCss).toMatch(
      /\.play-area-drawer--open \.selected-card-action-placeholder--play[\s\S]*?overflow:\s*hidden/
    )
    expect(appCss).toContain('max-height: 4.25rem')
    expect(appCss).not.toContain('width: 36px;\n    min-width: 36px;\n    height: 48px;')
    expect(turnCss).toMatch(
      /\.selected-card-action-placeholder--tech \.selected-card-action-tech-icon \{[\s\S]*?object-fit:\s*contain/
    )
  })

  it('splits shipping recall chips by step and uses a compact source title', () => {
    expect(turnControls).toContain('effectSourceGroupKey')
    expect(turnControls).toContain('effect-chip-group--shipping')
    expect(turnCss).toMatch(
      /\.effect-chip-group--shipping \{[\s\S]*?flex-direction:\s*column/
    )
    expect(turnCss).toMatch(
      /\.effect-chip-group--shipping \.effect-chip-source \{[\s\S]*?font-size:\s*0\.34rem/
    )
  })

  it('keeps pending-gain chip groups equal height and shows a disabled shipping influence bump', () => {
    expect(turnCss).toMatch(/\.effects-inline-panel \{[\s\S]*?align-items:\s*stretch/)
    expect(turnCss).toMatch(/\.effect-chip-group \{[\s\S]*?align-self:\s*stretch/)
    expect(turnControls).toContain('influenceBoardChoiceDisplayReward')
    expect(turnControls).toContain('influenceBoardSelectionActive && isInfluenceBoardChoice(fixedChoice)')
  })

  it('opens owned techs in PlayerTechModal instead of inline tiles', () => {
    expect(turnControls).toContain('renderTechActionButton')
    expect(turnControls).toContain('selected-card-action-placeholder--tech')
    expect(turnControls).toContain('<PlayerTechModal')
    expect(turnControls).not.toContain('{techControlsRow}')
    expect(techModal).toContain('TurnControlsTechRow')
    expect(seatChrome).toContain('<PlayerTechModal')
  })
})
