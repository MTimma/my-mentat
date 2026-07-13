import { describe, it, expect } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { AgentIcon, TurnType } from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard } from './_helpers'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id
const SELECTIVE_BREEDING_ID = BOARD_SPACES.find(s => s.name === 'Selective Breeding')!.id

describe('Pending drawCards rewards (CLAIM_ALL)', () => {
  it('claiming board drawCards after agent turn does not remove other hand cards from deck', () => {
    const cardLeftInHand = stubDeckCard(5001)
    const playedCard = stubDeckCard(5002, { agentIcons: [AgentIcon.CITY] })
    const filler = stubDeckCard(5003)

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

  it('Selective Breeding: trash from discard and draw 2 with thin draw pile refills from discard', () => {
    const played = stubDeckCard(5101, { agentIcons: [AgentIcon.BENE_GESSERIT] })
    const hand2 = stubDeckCard(5102)
    const hand3 = stubDeckCard(5103)
    const hand4 = stubDeckCard(5104)
    const drawPile = stubDeckCard(5105)
    const dagger = stubDeckCard(5106)
    const discardFiller = stubDeckCard(5107)

    let s = getBaseTestState({
      deck: [played, hand2, hand3, hand4, drawPile],
      handCount: 4,
      discardPile: [dagger, discardFiller],
      spice: 10,
      agents: 2,
    })
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: played.id })
    s = applyGameAction(s, {
      type: 'PLACE_AGENT',
      playerId: 0,
      spaceId: SELECTIVE_BREEDING_ID,
    })

    const trashEffect = s.currTurn?.optionalEffects?.find(e => e.cost.trash)
    expect(trashEffect).toBeTruthy()

    s = applyGameAction(s, {
      type: 'PAY_COST',
      playerId: 0,
      effectId: trashEffect!.id,
      data: { trashedCardId: dagger.id },
    })
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })

    const p = s.players[0]
    expect(p.handCount).toBe(5)
    expect(p.trash.map(c => c.id)).toEqual([dagger.id])
    expect(p.discardPile).toEqual([])
    expect(p.deck.some(c => c.id === discardFiller.id)).toBe(true)
  })
})
