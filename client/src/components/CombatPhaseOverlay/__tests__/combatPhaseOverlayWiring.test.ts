import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/**
 * Source contracts for COMBAT RESOLUTION / Combat Phase overlay layout.
 */
describe('Combat phase overlay wiring', () => {
  const root = resolve(__dirname, '../../..')
  const overlay = readFileSync(
    resolve(root, 'components/CombatPhaseOverlay/CombatPhaseOverlay.tsx'),
    'utf8'
  )
  const css = readFileSync(
    resolve(root, 'components/CombatPhaseOverlay/CombatPhaseOverlay.css'),
    'utf8'
  )
  const app = readFileSync(resolve(root, 'App.tsx'), 'utf8')

  it('shows the conflict card on the left of the overlay', () => {
    expect(overlay).toContain('currentConflict')
    expect(overlay).toContain('conflictCardImageSrc')
    expect(overlay).toContain('combat-phase-conflict')
    expect(overlay).toContain('combat-phase-body')
    expect(app).toContain('currentConflict={combatOverlayState.currentConflict}')
    expect(css).toContain('.combat-phase-body')
    expect(css).toContain('.combat-phase-conflict')
  })

  it('uses Turn History leader portraits instead of agent silhouettes', () => {
    expect(overlay).toContain('getLeaderIconPath')
    expect(overlay).toContain('turn-history-player-badge')
    expect(overlay).toContain('turn-history-player-icon')
    expect(overlay).toContain('leader-avatar-btn')
    expect(overlay).not.toMatch(/<AgentIcon/)
    expect(overlay).not.toContain('getLeaderImage')
    expect(css).not.toContain('object-position: center 36%')
    expect(css).not.toContain('combat-phase-rank-portrait')
  })

  it('does not show leader names in ranked rows', () => {
    expect(overlay).not.toContain('combat-phase-rank-name')
    expect(css).not.toContain('.combat-phase-rank-name')
  })

  it('does not show an intrigue count badge', () => {
    expect(overlay).not.toContain('intrigueCount')
    expect(overlay).not.toContain('combat-phase-intrigue-count')
    expect(css).not.toContain('.combat-phase-intrigue-count')
  })

  it('uses combat-area rank chips with gains beside them', () => {
    expect(overlay).toContain('CombatRankChip')
    expect(overlay).toContain('buildCombatRankEntries')
    expect(overlay).not.toContain('combat-phase-rank-head')
    expect(overlay).not.toContain('Combat Resolution')
    expect(overlay).not.toContain('Combat Phase')
    expect(overlay).toContain('turn-history-action-kind--combat')
    expect(css).toMatch(/\.combat-phase-rank \{[\s\S]*?flex-direction: row/)
    expect(css).toContain('.combat-phase-rank .combat-rank-strip__chip')
    expect(css).toContain('.combat-phase-modal-heading')
  })

  it('uses explicit desktop leader portrait sizes in rank chips, not board-strip cqh', () => {
    expect(css).toMatch(
      /\.combat-phase-rank \.combat-rank-strip__leader \{[\s\S]*?width: 48px/
    )
    expect(css).toMatch(
      /\.combat-phase-rank \.combat-rank-strip__leader \{[\s\S]*?min-width: 48px/
    )
    expect(css).toMatch(
      /\.combat-phase-rank \.combat-rank-strip__chip \{[\s\S]*?width: 104px/
    )
    expect(css).toMatch(
      /@media \(max-width: 600px\)[\s\S]*\.combat-phase-rank \.combat-rank-strip__leader \{[\s\S]*?width: 32px/
    )
    expect(css).not.toMatch(
      /\.combat-phase-rank \.combat-rank-strip__leader \{[\s\S]*?width:\s*\d+cqh/
    )
  })

  it('keeps live-turn leader badges at 28–32px', () => {
    expect(overlay).toContain('turn-history-player-badge')
    expect(css).toMatch(/\.combat-phase-modal \.turn-history-player-badge \{[\s\S]*?width: 32px/)
    expect(css).toMatch(/@media \(max-width: 600px\)[\s\S]*width: 28px/)
    expect(css).toMatch(/@media \(max-width: 400px\)[\s\S]*width: 28px/)
    expect(css).not.toMatch(/\.combat-phase-modal \.turn-history-player-badge \{[^}]*width: 1[68]px/)
  })

  it('keeps the conflict card on the left at phone width and readable size', () => {
    expect(css).toMatch(/\.combat-phase-body \{[\s\S]*?flex-direction: row/)
    expect(css).toMatch(/@media \(max-width: 600px\)[\s\S]*\.combat-phase-body \{[\s\S]*?flex-direction: row/)
    expect(css).not.toContain('min-width: 84px')
    expect(css).toMatch(/@media \(max-width: 600px\)[\s\S]*min-width: 96px/)
  })

  it('stacks intrigue names above their effects', () => {
    expect(css).toMatch(
      /\.combat-phase-rank-intrigues \.turn-gain-source-group \{[\s\S]*?flex-direction: column/
    )
  })

  it('wraps placement reward icons instead of clipping them', () => {
    expect(css).toMatch(
      /\.combat-phase-rank-rewards \.turn-gain-source-flow[\s\S]*?flex-wrap: wrap/
    )
    expect(css).toMatch(
      /\.combat-phase-rank-rewards \.turn-gains-side \{[\s\S]*?flex-wrap: wrap/
    )
  })

  it('tightens board-scoped overlay below 280px without shrinking portraits below 28px', () => {
    expect(css).toContain('container-name: combat-phase-board')
    expect(css).toMatch(/@container combat-phase-board \(max-width: 280px\)[\s\S]*width: 28px/)
    expect(css).not.toMatch(
      /@container combat-phase-board \(max-width: 280px\)[\s\S]*?\.turn-history-player-badge \{[^}]*width: 1[68]px/
    )
  })

  it('omits the placement-rewards hint from combat resolution', () => {
    expect(overlay).not.toContain('Placement rewards and combat intrigues played this round.')
    expect(overlay).toContain('{!readOnly ? (')
    expect(overlay).toContain('combat-phase-hint')
  })

  it('sizes the overlay to content and insets it from the left edge', () => {
    expect(css).toMatch(/\.combat-phase-overlay \{[\s\S]*?justify-content: flex-start/)
    expect(css).toMatch(/\.combat-phase-overlay \{[\s\S]*?padding-left: 64px/)
    expect(css).toMatch(/\.combat-phase-modal \{[\s\S]*?width: max-content/)
    expect(css).toMatch(/\.combat-phase-modal--with-conflict \{[\s\S]*?width: max-content/)
    expect(css).toMatch(/\.combat-phase-rankings \{[\s\S]*?flex: 0 0 auto/)
    expect(css).not.toMatch(/\.combat-phase-modal \{[\s\S]*?container-type: inline-size/)
    expect(css).not.toContain('width: min(720px, 100%)')
    expect(css).not.toContain('width: min(640px, 100%)')
    expect(css).not.toContain('width: min(440px, 100%)')
  })

  it('renders placement rewards and played combat intrigues from the combat snapshot', () => {
    expect(overlay).toContain('resolutionState')
    expect(overlay).toContain('TurnGainsDisplay')
    expect(overlay).toContain('GainSource.CONFLICT')
    expect(overlay).toContain('GainSource.INTRIGUE')
    expect(overlay).toContain('IntrigueCardType.COMBAT')
    expect(overlay).toContain('playedIntrigueCard')
    expect(overlay).toContain('combat-phase-rank-rewards')
    expect(overlay).toContain('combat-phase-rank-intrigues')
    expect(overlay).toContain('combat-phase-intrigue-name')
    expect(app).toContain('buildCombatResolutionView')
    expect(app).toContain('resolutionState={combatResolutionState}')
    expect(app).toContain('liveCombatRewardsPhase')
    expect(app).toContain('readOnly={viewingCombatHistory || liveCombatRewardsPhase}')
    expect(app).not.toContain('resolutionState={viewingCombatHistory ? combatOverlayState : undefined}')
  })
})
