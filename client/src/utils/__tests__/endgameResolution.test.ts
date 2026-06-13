import { describe, expect, it } from 'vitest'
import { intrigueCards } from '../../services/IntrigueDeckService'
import { FactionType, GamePhase } from '../../types/GameTypes'
import { getFreshDefaultGameState } from '../../components/GameContext/GameContext'
import { makePlayer } from '../../components/GameContext/__tests__/_helpers'
import {
  drawIntrigueCardsFromDeck,
  endgameHasPendingWork,
  endgameRevealIncomplete,
  intrigueCardHasEndgameEffect,
  revealAllEndgameIntrigue,
  revealEndgameIntrigueSelection,
  resolveEndgameWinners,
} from '../endgameResolution'

function smfCard(id: number) {
  return {
    id,
    name: 'The Spice Must Flow',
    cost: 2,
    image: '',
    agentIcons: [],
    revealEffect: [{ reward: { spice: 1 } }],
    acquireEffect: { victoryPoints: 1 },
  }
}

describe('endgameResolution', () => {
  it('intrigueCardHasEndgameEffect matches ENDGAME cards and Tiebreaker', () => {
    const corner = intrigueCards.find(c => c.id === 9)!
    const tiebreaker = intrigueCards.find(c => c.id === 27)!
    const plot = intrigueCards.find(c => c.id === 7)!
    expect(intrigueCardHasEndgameEffect(corner)).toBe(true)
    expect(intrigueCardHasEndgameEffect(tiebreaker)).toBe(true)
    expect(intrigueCardHasEndgameEffect(plot)).toBe(false)
  })

  it('drawIntrigueCardsFromDeck takes from the top of the deck pile', () => {
    const a = intrigueCards[0]
    const b = intrigueCards[1]
    const c = intrigueCards[2]
    const { drawn, remaining } = drawIntrigueCardsFromDeck([a, b, c], 2)
    expect(drawn).toEqual([b, c])
    expect(remaining).toEqual([a])
  })

  it('revealAllEndgameIntrigue reveals all cards and queues only endgame-effect cards', () => {
    const corner = intrigueCards.find(c => c.id === 9)!
    const plot = intrigueCards.find(c => c.id === 7)!
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      firstPlayerMarker: 0,
      players: [
        makePlayer(0, {
          intrigueCount: 2,
          deck: [smfCard(301), smfCard(302)],
          discardPile: [],
        }),
        makePlayer(1, { id: 1, intrigueCount: 0 }),
      ],
      intrigueDeck: [...intrigueCards.filter(c => c.id !== 7 && c.id !== 9), plot, corner],
    }

    const { state: after, revealedByPlayer, applyQueue } = revealAllEndgameIntrigue(s)

    expect(revealedByPlayer[0]?.map(c => c.id)).toEqual([7, 9])
    expect(applyQueue).toEqual([{ playerId: 0, cardId: 9 }])
    expect(after.players[0].intrigueCount).toBe(0)
    expect(after.intrigueDiscard.map(c => c.id)).toContain(7)
    expect(after.intrigueDiscard.map(c => c.id)).not.toContain(9)
    expect(
      endgameHasPendingWork({
        ...after,
        endgameApplyQueue: applyQueue,
        endgameRevealDonePlayers: new Set(after.players.map(p => p.id)),
      })
    ).toBe(true)
  })

  it('revealEndgameIntrigueSelection applies manual picks and queues endgame effects', () => {
    const corner = intrigueCards.find(c => c.id === 9)!
    const plot = intrigueCards.find(c => c.id === 7)!
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      players: [
        makePlayer(0, { intrigueCount: 2 }),
        makePlayer(1, { id: 1, intrigueCount: 0 }),
      ],
      intrigueDeck: [...intrigueCards.filter(c => c.id !== 7 && c.id !== 9), plot, corner],
      endgameRevealDonePlayers: new Set(),
    }

    const { state: after, applyQueue } = revealEndgameIntrigueSelection(s, 0, [plot, corner])

    expect(after.players[0].intrigueCount).toBe(0)
    expect(after.endgameRevealedIntrigue?.[0]?.map(c => c.id)).toEqual([7, 9])
    expect(applyQueue).toEqual([{ playerId: 0, cardId: 9 }])
    expect(after.intrigueDiscard.map(c => c.id)).toContain(7)
    expect(after.intrigueDeck.map(c => c.id)).not.toContain(7)
    expect(after.intrigueDeck.map(c => c.id)).not.toContain(9)
  })

  it('endgameRevealIncomplete is true until every player has revealed', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      players: [makePlayer(0, { intrigueCount: 1 }), makePlayer(1, { id: 1, intrigueCount: 0 })],
      endgameRevealDonePlayers: new Set(),
    }
    expect(endgameRevealIncomplete(s)).toBe(true)
    s = { ...s, endgameRevealDonePlayers: new Set([0, 1]) }
    expect(endgameRevealIncomplete(s)).toBe(false)
  })

  it('resolveEndgameWinners respects tiebreaker spice', () => {
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      phase: GamePhase.END_GAME,
      players: [
        makePlayer(0, { victoryPoints: 5, spice: 0 }),
        makePlayer(1, { id: 1, victoryPoints: 5, spice: 0 }),
      ],
      endgameTiebreakerSpice: { 0: 10 },
    }
    expect(resolveEndgameWinners(s)).toEqual([0])
  })
})
