import { describe, it, expect } from 'vitest'
import { STARTING_DECK } from '../../../data/cards'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { TurnType } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState } from './_helpers'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id

describe('Pending drawCards rewards (CLAIM_ALL)', () => {
  const playedCard = structuredClone(STARTING_DECK.find(c => c.name === 'Reconnaissance')!)
  const cardLeftInHand = structuredClone(STARTING_DECK.find(c => c.name === 'Reverend Mother Mohiam')!)
  const filler = structuredClone(STARTING_DECK.find(c => c.name === 'Convincing Argument' && c.id === 1)!)

  it('claiming board drawCards after agent turn does not remove other hand cards from deck', () => {
    let s = getBaseTestState({
      deck: [cardLeftInHand, playedCard, filler, filler, filler, filler],
      handCount: 5,
      agents: 2,
    })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION } }
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: playedCard.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })

    const afterPlace = s.players[0]
    expect(afterPlace.handCount).toBe(4)
    expect(afterPlace.deck.length).toBe(5)
    expect(afterPlace.deck[0].id).toBe(cardLeftInHand.id)

    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })

    const player = s.players[0]
    expect(player.handCount).toBe(5)
    expect(player.deck.length).toBe(5)
    expect(player.deck[0].id).toBe(cardLeftInHand.id)
    expect(player.deck.some(c => c.id === playedCard.id)).toBe(false)
    expect(player.playArea.map(c => c.id)).toEqual([playedCard.id])
  })
})
