import { describe, expect, it } from 'vitest'
import { getFreshDefaultGameState, applyGameAction } from '../GameContext'
import { TechTileId } from '../../../data/techTiles'
import {
  applyHoloprojectorsDiscard,
  applySonicSnoopersDraw,
  applySonicSnoopersReturn,
  handleActivateTech,
} from '../riseOfIxReducer'
import { tilesActivatableNow } from '../../../utils/techTiles'
import { ChoiceType, GamePhase, GainSource, NO_EXPANSIONS, RewardType, TurnType, type CardSelectChoice } from '../../../types/GameTypes'
import { makePlayer, stubDeckCard } from './_helpers'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../../../data/intrigueCardsRiseOfIx'

const RISE_OF_IX = { ...NO_EXPANSIONS, riseOfIx: true }

function roiState(overrides: Record<string, unknown> = {}) {
  const base = getFreshDefaultGameState()
  const p0 = makePlayer(0, {
    solari: 20,
    troops: 5,
    tech: [{ id: TechTileId.FLAGSHIP, faceUp: true }],
    deck: [makePlayer(0).deck[0]],
    handCount: 5,
  })
  return {
    ...base,
    expansions: RISE_OF_IX,
    players: [p0, makePlayer(1)],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    currTurn: { playerId: 0, type: TurnType.ACTION },
    ...overrides,
  }
}

describe('tech tile activation', () => {
  it('ACTIVATE_TECH no-op when riseOfIx false', () => {
    const before = roiState({ expansions: NO_EXPANSIONS })
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.FLAGSHIP,
    })
    expect(after).toBe(before)
    expect(after.players[0].solari).toBe(20)
    expect(after.players[0].troops).toBe(5)
  })

  it('Flagship activation costs 4 solari grants 3 troops', () => {
    const before = roiState()
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.FLAGSHIP,
    })
    expect(after.players[0].solari).toBe(16)
    expect(after.players[0].troops).toBe(8)
    expect(after.players[0].activatedTechThisRound).toEqual([TechTileId.FLAGSHIP])
  })

  it('tile flips face-down after activation', () => {
    const before = roiState()
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.FLAGSHIP,
    })
    expect(after.players[0].tech?.[0]?.faceUp).toBe(false)
  })

  it('not activatable when wrong turn type', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.INVASION_SHIPS, faceUp: true }],
          deck: [makePlayer(0).deck[0]],
          handCount: 5,
        }),
        makePlayer(1),
      ],
      currTurn: { playerId: 0, type: TurnType.REVEAL },
    })
    expect(tilesActivatableNow(before, 0).map(t => t.id)).not.toContain(TechTileId.INVASION_SHIPS)
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.INVASION_SHIPS,
    })
    expect(after).toBe(before)
  })

  it('Spy Satellites activation costs 3 spice grants 1 VP and removes tile', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          spice: 5,
          tech: [{ id: TechTileId.SPY_SATELLITES, faceUp: true }],
        }),
        makePlayer(1),
      ],
    })
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.SPY_SATELLITES,
    })
    expect(after.players[0].spice).toBe(2)
    expect(after.players[0].victoryPoints).toBe(1)
    expect(after.players[0].tech).toEqual([])
  })

  it('Spy Satellites no-op when spice below 3', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          spice: 2,
          tech: [{ id: TechTileId.SPY_SATELLITES, faceUp: true }],
        }),
        makePlayer(1),
      ],
    })
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.SPY_SATELLITES,
    })
    expect(after).toBe(before)
  })

  it('Holoprojectors discard from hand draws 1 from deck', () => {
    const hand1 = stubDeckCard(101)
    const hand2 = stubDeckCard(102)
    const drawTop = stubDeckCard(103)
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [hand1, hand2, drawTop],
          handCount: 2,
          discardPile: [],
        }),
        makePlayer(1),
      ],
    })
    const after = applyHoloprojectorsDiscard(before, 0, [hand1.id])
    const p = after.players[0]
    expect(p.handCount).toBe(2)
    expect(p.deck.map(c => c.id)).toEqual([hand2.id, drawTop.id])
    expect(p.discardPile.map(c => c.id)).toEqual([hand1.id])
    const discardGain = after.gains.find(g => g.type === RewardType.DISCARD)
    expect(discardGain).toMatchObject({
      sourceId: hand1.id,
      name: 'Holoprojectors',
      amount: -1,
      source: GainSource.TECH,
    })
    expect(after.gains.some(g => g.type === RewardType.DRAW && g.amount === 1)).toBe(true)
  })

  it('Holoprojectors rejects discarding a draw-pile card', () => {
    const hand1 = stubDeckCard(111)
    const drawTop = stubDeckCard(112)
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [hand1, drawTop],
          handCount: 1,
          discardPile: [],
        }),
        makePlayer(1),
      ],
    })
    const after = applyHoloprojectorsDiscard(before, 0, [drawTop.id])
    expect(after).toBe(before)
  })

  it('Holoprojectors enqueue adds hand-only discard picker constraints', () => {
    const hand1 = stubDeckCard(121)
    const drawTop = stubDeckCard(122)
    let s = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [hand1, drawTop],
          handCount: 1,
        }),
        makePlayer(1),
      ],
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        gainsStartIndex: 0,
        pendingChoices: [],
      },
    })
    s = handleActivateTech(s, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.HOLOPROJECTORS,
    })
    const choice = s.currTurn?.pendingChoices?.[0] as CardSelectChoice | undefined
    expect(choice?.discardCost).toBe(1)
    expect(choice?.filter?.(hand1)).toBe(true)
    expect(choice?.filter?.(drawTop)).toBe(false)
  })

  it('Sonic Snoopers activation enqueues intrigue deck choice and trashes tile', () => {
    const before = roiState({
      intrigueDeck: [...RISE_OF_IX_INTRIGUE_CARDS],
      intrigueDiscard: [],
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.SONIC_SNOOPERS, faceUp: true }],
          intrigueCount: 0,
        }),
        makePlayer(1),
      ],
    })
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.SONIC_SNOOPERS,
    })
    expect(after.players[0].tech).toEqual([])
    const choice = after.currTurn?.pendingChoices?.[0]
    expect(choice?.type).toBe(ChoiceType.CARD_SELECT)
    expect(choice?.prompt).toContain('Sonic Snoopers')
  })

  it('Sonic Snoopers draw then return swaps intrigue deck and discard', () => {
    const deckCard = RISE_OF_IX_INTRIGUE_CARDS[0]
    const discardCard = RISE_OF_IX_INTRIGUE_CARDS[1]
    const before = roiState({
      intrigueDeck: [deckCard, ...RISE_OF_IX_INTRIGUE_CARDS.slice(2)],
      intrigueDiscard: [discardCard],
      players: [
        makePlayer(0, { intrigueCount: 0 }),
        makePlayer(1),
      ],
    })
    const afterDraw = applySonicSnoopersDraw(before, 0, deckCard.id)
    expect(afterDraw.players[0].intrigueCount).toBe(1)
    expect(afterDraw.intrigueDeck.some(c => c.id === deckCard.id)).toBe(false)
    expect(afterDraw.currTurn?.pendingChoices?.[0]?.prompt).toContain('return')

    const afterReturn = applySonicSnoopersReturn(afterDraw, 0, discardCard.id)
    expect(afterReturn.players[0].intrigueCount).toBe(0)
    expect(afterReturn.intrigueDeck.some(c => c.id === discardCard.id)).toBe(true)
    expect(afterReturn.intrigueDiscard.some(c => c.id === discardCard.id)).toBe(false)
  })

  it('Holoprojectors end-to-end via RESOLVE_CARD_SELECT', () => {
    const hand1 = stubDeckCard(201)
    const drawTop = stubDeckCard(202)
    let s = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [hand1, drawTop],
          handCount: 1,
        }),
        makePlayer(1),
      ],
    })
    s = handleActivateTech(s, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.HOLOPROJECTORS,
    })
    const choice = s.currTurn?.pendingChoices?.[0]
    expect(choice).toBeDefined()
    s = applyGameAction(s, {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: choice!.id,
      cardIds: [hand1.id],
    })
    expect(s.players[0].handCount).toBe(1)
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([hand1.id])
    expect(s.players[0].deck.map(c => c.id)).toEqual([drawTop.id])
  })

  it('Training Drones activation grants +1 troop and flips face-down', () => {
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.TRAINING_DRONES, faceUp: true }],
          troops: 3,
          troopSupply: 5,
        }),
        makePlayer(1),
      ],
    })
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.TRAINING_DRONES,
    })
    expect(after.players[0].troops).toBe(4)
    expect(after.players[0].tech?.[0]?.faceUp).toBe(false)
    expect(after.players[0].activatedTechThisRound).toContain(TechTileId.TRAINING_DRONES)
  })
})
