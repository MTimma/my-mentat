import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { GainSource, RewardType } from '../../../types/GameTypes'
import { getRepeatedIconDisplay } from '../../../utils/turnGainsDisplay'
import TurnGainsDisplay from '../TurnGainsDisplay'

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

  it('renders one intrigue icon with the count instead of repeating icons', () => {
    const render = (amount: number) =>
      renderToStaticMarkup(
        React.createElement(TurnGainsDisplay, {
          gains: [
            {
              round: 1,
              playerId: 0,
              sourceId: 0,
              name: 'Sonic Snoopers',
              amount,
              type: RewardType.INTRIGUE,
              source: GainSource.TECH,
            },
          ],
          playerId: 0,
        })
      )

    const multiple = render(5)
    expect((multiple.match(/\/icon\/intrigue\.png/g) ?? []).length).toBe(1)
    expect(multiple).toContain('turn-gain-resource-amt">5')

    const single = render(1)
    expect((single.match(/\/icon\/intrigue\.png/g) ?? []).length).toBe(1)
    expect(single).not.toContain('turn-gain-resource-amt')
  })

  it('puts a self-trashed tech tile on its own line above the flow', () => {
    const html = renderToStaticMarkup(
      React.createElement(TurnGainsDisplay, {
        gains: [
          {
            round: 1,
            playerId: 0,
            sourceId: 0,
            name: 'Sonic Snoopers',
            amount: -1,
            type: RewardType.TRASH,
            source: GainSource.TECH,
          },
          {
            round: 1,
            playerId: 0,
            sourceId: 0,
            name: 'Sonic Snoopers',
            amount: -2,
            type: RewardType.INTRIGUE,
            source: GainSource.TECH,
          },
          {
            round: 1,
            playerId: 0,
            sourceId: 0,
            name: 'Sonic Snoopers',
            amount: 2,
            type: RewardType.INTRIGUE,
            source: GainSource.TECH,
          },
        ],
        playerId: 0,
        inlineTrash: true,
      })
    )
    expect(html).toContain('turn-gain-self-trash-row')
    expect(html.indexOf('turn-gain-self-trash-row')).toBeLessThan(
      html.indexOf('turn-gain-source-flow')
    )
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

  it('renders trashed cards by title, with the full image on zoom', () => {
    expect(tsx).toContain('renderInlineTrashGain')
    expect(tsx).toContain('renderAcquiredCardTitle(gain.cardId, label, `trash-inline-card-${index}`)')
    expect(tsx).toContain('turn-gain-card-title-zoom-src')
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

  it('draws one bump icon per Interstellar Shipping advance', () => {
    expect(tsx).toContain('freighterAdvanceIconCount(stepAmount)')
    expect(tsx).toContain('turn-gain-freighter-moves')
  })

  it('reveal turns pool persuasion and swords, then title other effects', () => {
    expect(tsx).toContain('revealPooledTotals')
    expect(tsx).toContain('splitRevealPooledGains')
    expect(tsx).toContain('turn-gain-total-pooled-label')
    expect(tsx).toContain('turn-gain-total-item--pooled-reveal')
    expect(tsx).toContain('turn-gain-persuasion-sources')
    expect(tsx).toContain('turn-gain-combat-sources')
    expect(tsx).toContain('getCombatSourceContributions')
    expect(tsx).toContain('total:')
    expect(tsx).not.toContain('data-preview-hover')
  })
})
