import { describe, expect, it } from 'vitest'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import { baseGameManifest } from '../../../test-fixtures/baseGameManifest'
import {
  AUTO_APPLIED_CUSTOM_EFFECTS,
  RewardType,
  type Card,
} from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import {
  claimAllPendingRewards,
  findSpaceForAgentIcon,
  getBaseTestState,
  playAgentTurn,
} from './_helpers'

const byName = new Map(IMPERIUM_ROW_DECK.map(c => [c.name, c]))

function hasNonAutomatableAgentPlay(card: Card): boolean {
  if (!card.agentIcons?.length) return true
  if (card.infiltrate) return true
  return Boolean(
    card.playEffect?.some(
      e =>
        e.beforePlaceAgent?.recallAgent ||
        e.choiceOpt ||
        (e.reward?.custom &&
          !AUTO_APPLIED_CUSTOM_EFFECTS.includes(e.reward.custom))
    )
  )
}

function sumRevealPersuasion(card: Card): number {
  return (
    card.revealEffect?.reduce((sum, e) => sum + (e.reward.persuasion ?? 0), 0) ??
    0
  )
}

function sumRevealCombat(card: Card): number {
  return (
    card.revealEffect?.reduce((sum, e) => sum + (e.reward.combat ?? 0), 0) ?? 0
  )
}

const agentTestCards = baseGameManifest.imperiumRow
  .map(entry => ({ entry, card: byName.get(entry.codeName)! }))
  .filter(({ card }) => card && !hasNonAutomatableAgentPlay(card))

const revealTestCards = baseGameManifest.imperiumRow
  .map(entry => ({ entry, card: byName.get(entry.codeName)! }))
  .filter(({ card }) => {
    if (!card) return false
    if (card.revealEffect?.some(e => e.reward.custom || e.choiceOpt || e.requirement)) {
      return false
    }
    return sumRevealPersuasion(card) > 0 || sumRevealCombat(card) > 0
  })

describe('Imperium row cards — manifest ↔ code', () => {
  it('has every base imperium row card in IMPERIUM_ROW_DECK', () => {
    const missing = baseGameManifest.imperiumRow
      .filter(e => !byName.has(e.codeName))
      .map(e => e.codeName)
    expect(missing).toEqual([])
  })

  for (const entry of baseGameManifest.imperiumRow) {
    it(`${entry.codeName} cost matches manifest (${entry.cost})`, () => {
      expect(byName.get(entry.codeName)?.cost).toBe(Number(entry.cost))
    })
  }
})

describe('Imperium row cards — agent box (automated smoke)', () => {
  for (const { entry, card } of agentTestCards) {
    it(`${entry.codeName}: places agent on board`, () => {
      const icon = card.agentIcons[0]
      let s = getBaseTestState({
        deck: [card],
        handCount: 1,
        spice: 30,
        solari: 30,
        water: 30,
        troops: 20,
      })
      const spaceId = findSpaceForAgentIcon(icon, s.players[0], s.factionInfluence)
      expect(spaceId, `no affordable space for icon ${icon}`).not.toBeNull()
      s = playAgentTurn(s, 0, card.id, spaceId!)
      expect(s.occupiedSpaces[spaceId!]).toContain(0)
      expect(s.currTurn?.agentSpaceId).toBe(spaceId)
    })
  }
})

describe('Imperium row cards — reveal (automated smoke)', () => {
  for (const { entry, card } of revealTestCards) {
    it(`${entry.codeName}: reveal persuasion/swords from card data`, () => {
      const expectedPers = sumRevealPersuasion(card)
      const expectedCombat = sumRevealCombat(card)
      let s = getBaseTestState({ agents: 0, deck: [card], handCount: 1 })
      s = applyGameAction(s, {
        type: 'REVEAL_CARDS',
        playerId: 0,
        cardIds: [card.id],
      })
      s = claimAllPendingRewards(s, 0)
      if (expectedPers > 0) {
        const persGains = s.gains
          .filter(g => g.playerId === 0 && g.type === RewardType.PERSUASION)
          .reduce((sum, g) => sum + g.amount, 0)
        expect(s.players[0].persuasion + persGains).toBeGreaterThanOrEqual(expectedPers)
      }
      if (expectedCombat > 0) {
        const combatGains = s.gains
          .filter(g => g.playerId === 0 && g.type === RewardType.COMBAT)
          .reduce((sum, g) => sum + g.amount, 0)
        expect(combatGains).toBeGreaterThanOrEqual(expectedCombat)
      }
    })
  }
})

describe('Imperium row cards — custom / manual follow-up', () => {
  it('tracks cards needing dedicated agent tests', () => {
    const customAgentCards = baseGameManifest.imperiumRow
      .map(e => byName.get(e.codeName)!)
      .filter(c => c && hasNonAutomatableAgentPlay(c))
      .map(c => c.name)
    expect(customAgentCards).toContain('The Voice')
    expect(customAgentCards.length).toBeGreaterThan(10)
  })
})

describe('Imperium row cards — acquire effects', () => {
  it('Spice Must Flow: ACQUIRE_SMF adds card to discard and VP', () => {
    let s = getBaseTestState({ persuasion: 10 })
    const deckLen = s.spiceMustFlowDeck.length
    const vpBefore = s.players[0].victoryPoints
    s = applyGameAction(s, { type: 'ACQUIRE_SMF', playerId: 0 })
    expect(s.spiceMustFlowDeck.length).toBe(deckLen - 1)
    expect(s.players[0].victoryPoints).toBeGreaterThan(vpBefore)
  })
})
