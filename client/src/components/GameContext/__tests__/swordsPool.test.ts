import { describe, expect, it } from 'vitest'
import { applyGameAction } from '../GameContext'
import { computeStrength } from '../../../utils/combatStrength'
import { cloneRoiCard, getRoiTestState } from './_helpers'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import { FactionType, RewardType, type Card } from '../../../types/GameTypes'

function cardByName(name: string, id: number): Card {
  const card = IMPERIUM_ROW_DECK.find(c => c.name === name)
  if (!card) throw new Error(`card not found: ${name}`)
  return { ...structuredClone(card), id }
}

/**
 * Swords are pooled for the round: sources that grant combat while the player has no units
 * in the Conflict (reveal cards, reveal choices, tech) must still be kept and apply once a
 * unit is deployed — e.g. Reinforcements played on the Reveal turn.
 */
describe('swords pool — reveal sources with no units in the Conflict', () => {
  it('pools Imperial Bashar + Bene Gesserit Sister choice, then applies after Reinforcements deploys', () => {
    const bashar = { ...cloneRoiCard('Imperial Bashar'), id: 2079 }
    const fedaykin = cardByName('Fedaykin Death Commando', 2016)
    const bgs = cardByName('Bene Gesserit Sister', 2008)
    let s = getRoiTestState({
      players: 4,
      playerOverrides: {
        deck: [bashar, fedaykin, bgs],
        handCount: 3,
        troops: 3,
        solari: 20,
      },
    })
    s = {
      ...s,
      factionInfluence: {
        ...s.factionInfluence,
        [FactionType.FREMEN]: { ...s.factionInfluence[FactionType.FREMEN], 0: 6 },
      },
    }

    s = applyGameAction(s, {
      type: 'REVEAL_CARDS',
      playerId: 0,
      cardIds: [bashar.id, fedaykin.id, bgs.id],
    })
    // Imperial Bashar: +2 base. No other card has produced swords yet — the Fedaykin's Fremen
    // Bond is not satisfied (no other Fremen card revealed or in play) and the Bene Gesserit
    // Sister's swords are still an unresolved choice.
    expect(s.combatStrength[0]).toBe(2)
    expect(s.players[0].combatValue).toBe(2)
    expect(computeStrength(s, 0)).toBe(0)
    expect(s.gains).toContainEqual(
      expect.objectContaining({ sourceId: bashar.id, type: RewardType.COMBAT, amount: 2 })
    )

    const bgsChoice = s.currTurn?.pendingChoices?.find(c => c.id === `card-${bgs.id}-OR`)
    expect(bgsChoice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: bgsChoice!.id,
      optionIndex: 1,
      source: { type: 'card', id: bgs.id, name: bgs.name },
    })
    // The Sister's 2 swords now count as a card that provided swords, so Bashar's bonus is
    // re-evaluated from 2 to 3.
    expect(s.gains).toContainEqual(
      expect.objectContaining({ sourceId: bgs.id, type: RewardType.COMBAT, amount: 2 })
    )
    expect(s.gains).toContainEqual(
      expect.objectContaining({ sourceId: bashar.id, type: RewardType.COMBAT, amount: 3 })
    )
    expect(s.combatStrength[0]).toBe(5)
    expect(computeStrength(s, 0)).toBe(0)

    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 23 })
    expect(s.currTurn?.theseTroopsDeployLimit).toBe(3)

    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    // 5 pooled swords + 1 troop × 2.
    expect(s.combatStrength[0]).toBe(7)
    expect(computeStrength(s, 0)).toBe(7)

    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    // 5 pooled swords + 3 troops × 2.
    expect(s.combatTroops[0]).toBe(3)
    expect(s.combatStrength[0]).toBe(11)
    expect(s.players[0].combatValue).toBe(11)
    expect(computeStrength(s, 0)).toBe(11)
  })
})
