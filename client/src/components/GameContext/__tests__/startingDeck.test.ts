import { describe, expect, it } from 'vitest'
import { STARTING_DECK } from '../../../data/cards'
import { applyGameAction } from '../GameContext'
import {
  beginPlayerTurns,
  claimAllPendingRewards,
  findSpaceForAgentIcon,
  getBaseTestState,
  playAgentTurn,
} from './_helpers'

const CLASSIC_STARTER_NAMES = [
  'Convincing Argument',
  'Dagger',
  'Diplomacy',
  'Dune, the Desert Planet',
  'Reconnaissance',
  'Seek Allies',
  'Signet Ring',
] as const

function starter(name: string) {
  return STARTING_DECK.find(c => c.name === name)!
}

describe('Starting deck — classic ten', () => {
  for (const name of CLASSIC_STARTER_NAMES) {
    it(`includes ${name}`, () => {
      expect(STARTING_DECK.some(c => c.name === name)).toBe(true)
    })
  }

  it('Convincing Argument is reveal-only (no agent icons)', () => {
    const card = starter('Convincing Argument')
    expect(card.agentIcons).toEqual([])
    expect(card.revealEffect?.[0]?.reward.persuasion).toBe(2)
  })

  it('Dagger: Landsraad agent placement', () => {
    const card = starter('Dagger')
    const spaceId = findSpaceForAgentIcon(card.agentIcons[0], getBaseTestState().players[0])!
    let s = getBaseTestState({ deck: [card], handCount: 1 })
    s = beginPlayerTurns(s)
    s = playAgentTurn(s, 0, card.id, spaceId)
    expect(s.occupiedSpaces[spaceId]).toContain(0)
  })

  it('Seek Allies: trashes itself on agent play after placement', () => {
    const card = starter('Seek Allies')
    const spaceId = findSpaceForAgentIcon(card.agentIcons[0], getBaseTestState().players[0])!
    let s = getBaseTestState({ deck: [card], handCount: 1 })
    s = beginPlayerTurns(s)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId })
    const trashReward = s.pendingRewards.find(r => r.reward.trashThisCard)
    s = applyGameAction(s, {
      type: 'CLAIM_REWARD',
      playerId: 0,
      rewardId: trashReward!.id,
      customData: { trashedCardId: card.id },
    })
    expect(s.players[0].trash.some(c => c.id === card.id)).toBe(true)
  })

  it('Signet Ring: agent play completes on valid board space', () => {
    const card = starter('Signet Ring')
    const spaceId = findSpaceForAgentIcon(card.agentIcons[0], getBaseTestState().players[0])!
    let s = getBaseTestState({ deck: [card], handCount: 1 })
    s = beginPlayerTurns(s)
    s = playAgentTurn(s, 0, card.id, spaceId)
    expect(s.currTurn?.agentSpaceId).toBe(spaceId)
  })

  it('Dune, the Desert Planet: reveal grants persuasion', () => {
    const card = starter('Dune, the Desert Planet')
    let s = getBaseTestState({ agents: 0, deck: [card], handCount: 1 })
    s = applyGameAction(s, {
      type: 'REVEAL_CARDS',
      playerId: 0,
      cardIds: [card.id],
    })
    s = claimAllPendingRewards(s, 0)
    expect(s.players[0].persuasion).toBeGreaterThanOrEqual(1)
  })
})
