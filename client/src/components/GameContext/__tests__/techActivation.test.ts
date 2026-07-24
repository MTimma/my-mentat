import { describe, expect, it } from 'vitest'
import { getFreshDefaultGameState, applyGameAction } from '../GameContext'
import { TechTileId } from '../../../data/techTiles'
import {
  applyHoloprojectorsDiscard,
  applySonicSnoopers,
  handleActivateTech,
  handleActivateTechDiscard,
  repairLegacyTechDiscardState,
} from '../riseOfIxReducer'
import { tilesActivatableNow } from '../../../utils/techTiles'
import { ChoiceType, CardPile, GamePhase, GainSource, NO_EXPANSIONS, RewardType, TurnType, type CardSelectChoice } from '../../../types/GameTypes'
import { makePlayer, stubDeckCard } from './_helpers'
import { RISE_OF_IX_INTRIGUE_CARDS } from '../../../data/intrigueCardsRiseOfIx'
import { RISE_OF_IX_IMPERIUM_DECK } from '../../../data/cardsRiseOfIx'

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
    expect(p.tech[0]?.faceUp).toBe(false)
    expect(p.activatedTechThisRound).toContain(TechTileId.HOLOPROJECTORS)
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

  it('repairLegacyTechDiscardState clears old pending choices and restores face-up tile', () => {
    const hand1 = stubDeckCard(161)
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: false }],
          activatedTechThisRound: [TechTileId.HOLOPROJECTORS],
          deck: [hand1],
          handCount: 1,
        }),
        makePlayer(1),
      ],
      canEndTurn: false,
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        pendingChoices: [
          {
            id: 'legacy-holo',
            type: ChoiceType.CARD_SELECT,
            prompt: 'Holoprojectors: discard 1 card to draw 1',
            piles: [CardPile.DECK],
            selectionCount: 1,
            discardCost: 1,
            onResolve: () => ({ type: 'CUSTOM_EFFECT' }),
            source: { type: GainSource.TECH, id: 0, name: 'Holoprojectors' },
          },
        ],
      },
    })
    const after = repairLegacyTechDiscardState(before)
    expect(after.currTurn?.pendingChoices).toEqual([])
    expect(after.canEndTurn).toBe(true)
    expect(after.players[0].tech[0]?.faceUp).toBe(true)
    expect(after.players[0].activatedTechThisRound ?? []).not.toContain(TechTileId.HOLOPROJECTORS)
  })

  it('Holoprojectors ACTIVATE_TECH is a no-op until a discard card is chosen', () => {
    const hand1 = stubDeckCard(121)
    const drawTop = stubDeckCard(122)
    const before = roiState({
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
    const after = handleActivateTech(before, {
      type: 'ACTIVATE_TECH',
      playerId: 0,
      tileId: TechTileId.HOLOPROJECTORS,
    })
    expect(after).toBe(before)
    expect(after.players[0].tech[0]?.faceUp).toBe(true)
    expect(after.players[0].activatedTechThisRound ?? []).not.toContain(TechTileId.HOLOPROJECTORS)
    expect(after.currTurn?.pendingChoices ?? []).toEqual([])
  })

  it('Holoprojectors ACTIVATE_TECH_DISCARD discards from hand, draws 1, and marks tile activated', () => {
    const hand1 = stubDeckCard(131)
    const drawTop = stubDeckCard(132)
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [hand1, drawTop],
          handCount: 1,
        }),
        makePlayer(1),
      ],
    })
    const after = handleActivateTechDiscard(before, {
      type: 'ACTIVATE_TECH_DISCARD',
      playerId: 0,
      tileId: TechTileId.HOLOPROJECTORS,
      cardIds: [hand1.id],
    })
    expect(after.players[0].handCount).toBe(1)
    expect(after.players[0].discardPile.map(c => c.id)).toEqual([hand1.id])
    expect(after.players[0].deck.map(c => c.id)).toEqual([drawTop.id])
    expect(after.players[0].tech[0]?.faceUp).toBe(false)
    expect(after.players[0].activatedTechThisRound).toContain(TechTileId.HOLOPROJECTORS)
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
    const discCard = RISE_OF_IX_INTRIGUE_CARDS[0]
    const before = roiState({
      intrigueDeck: [RISE_OF_IX_INTRIGUE_CARDS.slice(1)],
      intrigueDiscard: [discCard],
      players: [
        makePlayer(0, { intrigueCount: 2 }),
        makePlayer(1),
      ],
    })
    const pendingCount = applySonicSnoopers(before, 0)
    expect(pendingCount.currTurn?.pendingChoices?.[0]?.type).toBe(ChoiceType.COUNTER)

    const after = applySonicSnoopers(before, 0, 1)
    expect(after.gains.find(g => g.type === RewardType.INTRIGUE)?.amount).toBe(-1)
    expect(after.gains.find(g => g.type === RewardType.DRAW)?.amount).toBe(1)

    const afterMany = applySonicSnoopers(before, 0, 2)
    expect(afterMany.gains.find(g => g.type === RewardType.INTRIGUE)?.amount).toBe(-2)
    expect(afterMany.gains.find(g => g.type === RewardType.DRAW)?.amount).toBe(2)

    const afterIllegal = applySonicSnoopers(before, 0, 99)
    expect(afterIllegal).toBe(before)

    const afterIllegal2 = applySonicSnoopers(before, 0, -1)
    expect(afterIllegal2).toBe(before)

    const afterIllegal3 = applySonicSnoopers(before, 0, 0)
    expect(afterIllegal3).toBe(before)
  })

  it('Holoprojectors end-to-end via ACTIVATE_TECH_DISCARD action', () => {
    const hand1 = stubDeckCard(201)
    const drawTop = stubDeckCard(202)
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [hand1, drawTop],
          handCount: 1,
        }),
        makePlayer(1),
      ],
    })
    const after = applyGameAction(before, {
      type: 'ACTIVATE_TECH_DISCARD',
      playerId: 0,
      tileId: TechTileId.HOLOPROJECTORS,
      cardIds: [hand1.id],
    })
    expect(after.players[0].handCount).toBe(1)
    expect(after.players[0].discardPile.map(c => c.id)).toEqual([hand1.id])
    expect(after.players[0].deck.map(c => c.id)).toEqual([drawTop.id])
    expect(after.players[0].tech[0]?.faceUp).toBe(false)
  })

  it('Holoprojectors discard triggers unload on Freighter Fleet', () => {
    const freighterFleet = structuredClone(
      RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === 'Freighter Fleet')!
    )
    freighterFleet.id = 99050
    const before = roiState({
      players: [
        makePlayer(0, {
          tech: [{ id: TechTileId.HOLOPROJECTORS, faceUp: true }],
          deck: [freighterFleet],
          handCount: 1,
          freighterStep: 0,
        }),
        makePlayer(1),
      ],
    })
    const after = applyGameAction(before, {
      type: 'ACTIVATE_TECH_DISCARD',
      playerId: 0,
      tileId: TechTileId.HOLOPROJECTORS,
      cardIds: [freighterFleet.id],
    })
    const freighterChoice = after.currTurn?.pendingChoices?.find(
      c => c.type === ChoiceType.FIXED_OPTIONS && c.prompt.startsWith('Freighter')
    )
    expect(freighterChoice).toBeDefined()
    expect(freighterChoice?.source).toEqual(
      expect.objectContaining({ name: 'Freighter Fleet (Unload)' })
    )
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
