import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { getRepeatedIconDisplay } from '../../../utils/turnGainsDisplay'

describe('Gain count labels', () => {
  const tsx = readFileSync(
    resolve(__dirname, '../TurnGainsDisplay.tsx'),
    'utf8'
  )

  it('Heighliner recruits five troops', () => {
    const heighliner = BOARD_SPACES.find(space => space.name === 'Heighliner')
    expect(heighliner?.effects?.[0]?.reward?.troops).toBe(5)
  })

  it('five troops render as one cube plus a count', () => {
    expect(getRepeatedIconDisplay(5)).toEqual({ iconCount: 1, showTotalMultiplier: true })
  })

  it('prints the count as a plain number, not ×N', () => {
    expect(tsx).toContain('return <span className="gain-multiplier">{absAmount}</span>')
    expect(tsx).not.toContain('×{absAmount}')
  })

  it('sizes troop counts the same as spice and solari amounts', () => {
    const css = readFileSync(resolve(__dirname, '../TurnGainsDisplay.css'), 'utf8')
    expect(css).toMatch(/\.turn-gain-resource-amt \{[\s\S]*?font-size:\s*0\.72rem/)
    expect(css).toMatch(/\.turn-gains-display \.gain-multiplier \{[\s\S]*?font-size:\s*0\.72rem/)
    expect(css).toMatch(/\.turn-gains-display \.gain-multiplier \{[\s\S]*?font-weight:\s*800/)
  })

  it('renders Swordmaster as a player-colored agent icon', () => {
    expect(tsx).toContain('RewardType.SWORDMASTER')
    expect(tsx).toContain('renderAgentGainIcon')
    expect(tsx).toContain('AgentIcon')
  })

  it('renders bought tech tiles by name, not a thumbnail', () => {
    expect(tsx).toContain('renderTechTileGain')
    expect(tsx).toContain('turn-gain-tech-title')
    expect(tsx).toContain('turn-gain-tech-title-zoom-src')
    expect(tsx).not.toContain('turn-gain-tech-thumb')
    expect(tsx).toContain('RewardType.TECH')
  })

  it('renders acquired cards by title, not a thumbnail', () => {
    expect(tsx).toContain('ACQUIRE_GROUP_TITLE')
    expect(tsx).toContain('renderAcquiredCardTitle')
    expect(tsx).toContain('turn-gain-card-title')
    expect(tsx).toContain('turn-gain-card-title-zoom-src')
    expect(tsx).toContain('catalogDeckCardImageById')
  })

  it('shows Interstellar Shipping advance then recall with no cost arrow', () => {
    expect(tsx).toContain('peelFreighterRecallsFromCosts')
    expect(tsx).toContain('recallContent')
    expect(tsx).toContain('{costContent && (rewardContent || recallContent) ? (')
  })

  it('reveal turns pool persuasion and swords, then title other effects', () => {
    expect(tsx).toContain('revealPooledTotals')
    expect(tsx).toContain('splitRevealPooledGains')
    expect(tsx).toContain('turn-gain-total-pooled-label')
    expect(tsx).toContain('turn-gain-total-item--pooled-reveal')
    expect(tsx).toContain('turn-gain-persuasion-sources')
    expect(tsx).toContain('total:')
    expect(tsx).not.toContain('data-preview-hover')
  })
})
