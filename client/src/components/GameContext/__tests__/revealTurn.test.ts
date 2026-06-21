import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import {
  AgentIcon,
  ChoiceType,
  FactionType,
  GainSource,
  GamePhase,
  RewardType,
  TurnType,
  type Card,
  type FixedOptionsChoice,
  type GameState,
} from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id

/** Reveal-turn state with a custom imperium row and active reveal currTurn for player 0. */
function rowState(row: Card[], persuasion: number): GameState {
  const base = getBaseTestState({ persuasion })
  return {
    ...base,
    imperiumRow: row.map(c => ({ ...c })),
    currTurn: { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0 },
  }
}

describe('REVEAL_CARDS', () => {
  it('pools persuasion from revealed cards and moves them to the play area', () => {
    const cardA = stubDeckCard(9101, { revealEffect: [{ reward: { persuasion: 2 } }] })
    const cardB = stubDeckCard(9102, { revealEffect: [{ reward: { persuasion: 3 } }] })
    let s = getBaseTestState({ deck: [cardA, cardB, stubDeckCard(9103)], handCount: 3 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9101, 9102] })

    const p = s.players[0]
    expect(p.persuasion).toBe(5)
    expect(p.revealed).toBe(true)
    expect(p.playArea.map(c => c.id)).toEqual([9101, 9102])
    expect(p.deck.map(c => c.id)).toEqual([9103])
    // NOTE: current behavior — handCount is set to 0 unconditionally,
    // even when unrevealed cards remain in the deck array
    expect(p.handCount).toBe(0)

    expect(s.currTurn).toMatchObject({
      playerId: 0,
      type: TurnType.REVEAL,
      persuasionCount: 5,
      revealedCardIds: [9101, 9102],
      pendingChoices: [],
      optionalEffects: [],
      gainsStartIndex: 0,
    })
    expect(s.canEndTurn).toBe(true)
    expect(s.canAcquireIR).toBe(true)
    expect(s.pendingRewards).toEqual([])
    expect(s.gains).toEqual([
      expect.objectContaining({
        playerId: 0,
        sourceId: 9101,
        amount: 2,
        type: RewardType.PERSUASION,
        source: GainSource.CARD,
      }),
      expect.objectContaining({
        playerId: 0,
        sourceId: 9102,
        amount: 3,
        type: RewardType.PERSUASION,
        source: GainSource.CARD,
      }),
    ])
  })

  it('swords add combat strength when the player has troops in conflict', () => {
    const card = stubDeckCard(9111, { revealEffect: [{ reward: { combat: 3 } }] })
    let s = getBaseTestState({ deck: [card], handCount: 1, combatValue: 4 })
    s = { ...s, combatTroops: { 0: 2 }, combatStrength: { 0: 4 } }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9111] })

    expect(s.players[0].combatValue).toBe(7)
    expect(s.combatStrength).toEqual({ 0: 7 })
    expect(s.combatTroops).toEqual({ 0: 2 })
    expect(s.players[0].persuasion).toBe(0)
    expect(s.gains).toContainEqual(
      expect.objectContaining({ type: RewardType.COMBAT, amount: 3, sourceId: 9111 })
    )
  })

  it('swords contribute nothing without troops in conflict', () => {
    const card = stubDeckCard(9112, { revealEffect: [{ reward: { combat: 3 } }] })
    let s = getBaseTestState({ deck: [card], handCount: 1, combatValue: 5 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9112] })

    // NOTE: current behavior — with no troops in conflict the player's combatValue
    // is reset to 0 (even a pre-existing nonzero value), and combatStrength gets no entry
    expect(s.players[0].combatValue).toBe(0)
    expect(s.combatStrength).toEqual({})
    // The sword gain is still recorded in the gains log
    expect(s.gains).toContainEqual(
      expect.objectContaining({ type: RewardType.COMBAT, amount: 3, sourceId: 9112 })
    )
  })

  it('resource reveal rewards become pendingRewards (not applied immediately) and block canEndTurn', () => {
    const card = stubDeckCard(9121, {
      revealEffect: [{ reward: { spice: 2, water: 1, solari: 3, intrigueCards: 1, drawCards: 1 } }],
    })
    let s = getBaseTestState({ deck: [card], handCount: 1 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9121] })

    const p = s.players[0]
    // Resources untouched until the pending rewards are claimed
    expect(p.spice).toBe(10)
    expect(p.water).toBe(3)
    expect(p.solari).toBe(20)
    expect(p.intrigueCount).toBe(1)
    expect(s.pendingRewards.map(r => r.reward)).toEqual([
      { spice: 2 },
      { water: 1 },
      { solari: 3 },
      { intrigueCards: 1 },
      { drawCards: 1 },
    ])
    expect(
      s.pendingRewards.every(r => r.source.id === 9121 && r.source.type === GainSource.CARD)
    ).toBe(true)
    expect(s.pendingRewards.every(r => !r.isTrash && !r.disabled)).toBe(true)
    expect(s.canEndTurn).toBe(false)
  })

  it('High Council seat grants 2 persuasion on reveal', () => {
    let s = getBaseTestState({
      deck: [stubDeckCard(9131)],
      handCount: 1,
      hasHighCouncilSeat: true,
    })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9131] })

    expect(s.players[0].persuasion).toBe(2)
    expect(s.currTurn?.persuasionCount).toBe(2)
    expect(s.gains).toContainEqual(
      expect.objectContaining({
        source: GainSource.HIGH_COUNCIL,
        type: RewardType.PERSUASION,
        amount: 2,
      })
    )
  })

  it('multiple choiceOpt reveal effects create one FIXED_OPTIONS pending choice', () => {
    const card = stubDeckCard(9141, {
      revealEffect: [
        { choiceOpt: true, reward: { spice: 1 } },
        { choiceOpt: true, reward: { water: 1 } },
      ],
    })
    let s = getBaseTestState({ deck: [card], handCount: 1 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9141] })

    expect(s.currTurn?.pendingChoices).toHaveLength(1)
    const choice = s.currTurn!.pendingChoices![0] as FixedOptionsChoice
    expect(choice.type).toBe(ChoiceType.FIXED_OPTIONS)
    expect(choice.options.map(o => o.reward)).toEqual([{ spice: 1 }, { water: 1 }])
    expect(s.canEndTurn).toBe(false)
    // Nothing applied until the choice resolves
    expect(s.players[0].spice).toBe(10)
    expect(s.players[0].water).toBe(3)
  })

  it('cost-gated reveal effects become optionalEffects and do not block canEndTurn', () => {
    const card = stubDeckCard(9151, {
      revealEffect: [{ cost: { spice: 2 }, reward: { troops: 3 } }],
    })
    let s = getBaseTestState({ deck: [card], handCount: 1 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9151] })

    expect(s.currTurn?.optionalEffects).toHaveLength(1)
    expect(s.currTurn?.optionalEffects?.[0]).toMatchObject({
      cost: { spice: 2 },
      reward: { troops: 3 },
      source: { type: GainSource.CARD, id: 9151, name: 'stub-9151' },
    })
    expect(s.canEndTurn).toBe(true)
    expect(s.players[0].troops).toBe(8)
    expect(s.players[0].spice).toBe(10)
  })

  it('Gurney Halleck pay-3-solari reveal deploys only the recruited troops', () => {
    const gurney = stubDeckCard(9161, {
      name: 'Gurney Halleck',
      revealEffect: [
        { reward: { persuasion: 2 } },
        { cost: { solari: 3 }, reward: { troops: 2, deployTroops: 2 } },
      ],
    })
    let s = getBaseTestState({
      deck: [gurney],
      handCount: 1,
      solari: 20,
      troops: 4,
      troopSupply: 6,
      negotiatorsOnIx: 2,
      dreadnoughts: { supply: 1, garrison: 1, conflict: 0, control: [] },
    })
    s = {
      ...s,
      expansions: { riseOfIx: true, riseOfIxEpic: false },
    }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9161] })

    expect(s.players[0].persuasion).toBe(2)
    expect(s.currTurn?.optionalEffects).toHaveLength(1)
    expect(s.currTurn?.optionalEffects?.[0]).toMatchObject({
      cost: { solari: 3 },
      reward: { troops: 2, deployTroops: 2 },
      source: { type: GainSource.CARD, id: 9161, name: 'Gurney Halleck' },
    })
    expect(s.currTurn?.canDeployTroops).toBeFalsy()
    expect(s.currTurn?.theseTroopsDeployLimit).toBeUndefined()

    const effect = s.currTurn!.optionalEffects![0]
    s = applyGameAction(s, { type: 'PAY_COST', playerId: 0, effect })

    expect(s.players[0].solari).toBe(17)
    expect(s.players[0].troops).toBe(6)
    expect(s.currTurn?.canDeployTroops).toBe(true)
    expect(s.currTurn?.theseTroopsDeployLimit).toBe(2)
    expect(s.currTurn?.troopLimit ?? 0).toBe(0)
    expect(s.currTurn?.optionalEffects).toHaveLength(0)

    const beforeDread = s
    s = applyGameAction(s, { type: 'DEPLOY_DREADNOUGHT', playerId: 0 })
    expect(s.players[0].dreadnoughts?.conflict).toBe(0)
    expect(s.players[0].dreadnoughts?.garrison).toBe(beforeDread.players[0].dreadnoughts?.garrison)

    const beforeNeg = s
    s = applyGameAction(s, { type: 'DEPLOY_NEGOTIATOR', playerId: 0 })
    expect(s.combatNegotiators?.[0]).toBeUndefined()
    expect(s.players[0].negotiatorsOnIx).toBe(beforeNeg.players[0].negotiatorsOnIx)

    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    expect(s.combatTroops[0]).toBe(1)
    expect(s.currTurn?.removableTheseTroops).toBe(1)
    expect(s.players[0].troops).toBe(5)

    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    expect(s.combatTroops[0]).toBe(2)
    expect(s.currTurn?.removableTheseTroops).toBe(2)
    expect(s.players[0].troops).toBe(4)

    const atLimit = s
    s = applyGameAction(s, { type: 'DEPLOY_TROOP', playerId: 0 })
    expect(s.combatTroops[0]).toBe(atLimit.combatTroops[0])
    expect(s.players[0].troops).toBe(atLimit.players[0].troops)
  })

  it('REVEAL_CARDS by a non-active player is ignored', () => {
    const s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    expect(applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 1, cardIds: [] })).toBe(s)
  })
})

describe('ACQUIRE_CARD', () => {
  it('deducts persuasion, puts the card in the discard pile, and leaves a row gap with pending replacement', () => {
    const target = stubDeckCard(9201, { cost: 3 })
    const other = stubDeckCard(9202, { cost: 2 })
    let s = rowState([target, other], 5)
    const deckSizeBefore = s.imperiumRowDeck.length
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9201 })

    const p = s.players[0]
    expect(p.persuasion).toBe(2)
    expect(p.discardPile.map(c => c.id)).toEqual([9201])
    expect(p.deck.map(c => c.id)).toEqual([5000]) // deck untouched
    expect(s.imperiumRow.map(c => c.id)).toEqual([9202])
    expect(s.pendingImperiumRowReplacement).toEqual({ cardIndex: 0 })
    // NOTE: current behavior — the replacement card is not auto-drawn; the row stays
    // at 4 until SELECT_IMPERIUM_REPLACEMENT is dispatched (physical-game flow)
    expect(s.imperiumRowDeck.length).toBe(deckSizeBefore)
    expect(s.currTurn?.acquiredCards?.map(c => c.id)).toEqual([9201])
    expect(s.gains).toContainEqual(
      expect.objectContaining({ sourceId: 9201, amount: 1, type: RewardType.CARD })
    )
  })

  it('insufficient persuasion leaves the state unchanged', () => {
    const target = stubDeckCard(9203, { cost: 3 })
    const s = rowState([target], 2)
    expect(applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9203 })).toBe(s)
  })

  it('freeAcquire skips the persuasion cost', () => {
    const target = stubDeckCard(9204, { cost: 5 })
    let s = rowState([target], 0)
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9204, freeAcquire: true })

    expect(s.players[0].persuasion).toBe(0)
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([9204])
    expect(s.imperiumRow).toEqual([])
  })

  it('acquireToTop puts the acquired card on top of the deck instead of the discard pile', () => {
    const target = stubDeckCard(9206, { cost: 2 })
    let s = rowState([target], 5)
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9206, acquireToTop: true })

    expect(s.players[0].deck.map(c => c.id)).toEqual([9206, 5000])
    expect(s.players[0].discardPile).toEqual([])
  })

  it('acquireToTopThisRound enables optional top placement when acquireToTop is true', () => {
    const target = stubDeckCard(9207, { cost: 2 })
    let s = rowState([target], 5)
    s = { ...s, acquireToTopThisRound: { 0: true } }
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9207, acquireToTop: true })

    expect(s.players[0].deck.map(c => c.id)).toEqual([9207, 5000])
    expect(s.players[0].discardPile).toEqual([])
  })

  it('acquireToTopThisRound does not auto-top without an explicit acquireToTop choice', () => {
    const target = stubDeckCard(9208, { cost: 2 })
    let s = rowState([target], 5)
    s = { ...s, acquireToTopThisRound: { 0: true } }
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9208 })

    expect(s.players[0].deck.map(c => c.id)).toEqual([5000])
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([9208])
  })

  it('acquireEffect rewards fire immediately (troops + spice)', () => {
    const target = stubDeckCard(9205, { cost: 3, acquireEffect: { troops: 2, spice: 1 } })
    let s = rowState([target], 5)
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9205 })

    const p = s.players[0]
    expect(p.troops).toBe(10)
    expect(p.spice).toBe(11)
    expect(p.discardPile.map(c => c.id)).toEqual([9205])
    expect(s.gains).toContainEqual(
      expect.objectContaining({ name: 'stub-9205 Acquire', type: RewardType.TROOPS, amount: 2 })
    )
    expect(s.gains).toContainEqual(
      expect.objectContaining({ name: 'stub-9205 Acquire', type: RewardType.SPICE, amount: 1 })
    )
  })

  it('acquireEffect dreadnought commissions to garrison, deducts persuasion, and logs the gain', () => {
    const target = stubDeckCard(9208, { cost: 8, acquireEffect: { dreadnoughts: 1 } })
    let s = rowState([target], 13)
    s = {
      ...s,
      expansions: { riseOfIx: true, riseOfIxEpic: false },
      players: s.players.map((p, i) =>
        i === 0
          ? {
              ...p,
              dreadnoughts: { supply: 2, garrison: 0, conflict: 0, control: [] },
            }
          : p
      ),
    }
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9208 })

    const p = s.players[0]
    expect(p.persuasion).toBe(5)
    expect(p.dreadnoughts?.garrison).toBe(1)
    expect(p.dreadnoughts?.supply).toBe(1)
    expect(s.gains).toContainEqual(
      expect.objectContaining({
        sourceId: 9208,
        type: RewardType.DREADNOUGHT,
        amount: 1,
        source: GainSource.CARD,
      })
    )
  })

  it('acquireEffect multi-faction influence applies to all tracks (CHOAM Directorship)', () => {
    const target = stubDeckCard(9214, {
      cost: 8,
      acquireEffect: {
        influence: {
          amounts: [
            { faction: FactionType.FREMEN, amount: 1 },
            { faction: FactionType.BENE_GESSERIT, amount: 1 },
            { faction: FactionType.SPACING_GUILD, amount: 1 },
            { faction: FactionType.EMPEROR, amount: 1 },
          ],
        },
      },
    })
    let s = rowState([target], 10)
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9214 })

    const p = s.players[0]
    expect(s.factionInfluence[FactionType.FREMEN][0]).toBe(1)
    expect(s.factionInfluence[FactionType.BENE_GESSERIT][0]).toBe(1)
    expect(s.factionInfluence[FactionType.SPACING_GUILD][0]).toBe(1)
    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(1)
    expect(p.persuasion).toBe(2)
    expect(p.discardPile.map(c => c.id)).toEqual([9214])
  })

  it('acquireEffect multi-faction influence merges 4th-track milestone troops (CHOAM Directorship)', () => {
    const target = stubDeckCard(9215, {
      cost: 8,
      acquireEffect: {
        influence: {
          amounts: [
            { faction: FactionType.EMPEROR, amount: 1 },
            { faction: FactionType.FREMEN, amount: 1 },
            { faction: FactionType.BENE_GESSERIT, amount: 1 },
            { faction: FactionType.SPACING_GUILD, amount: 1 },
          ],
        },
      },
    })
    let s = rowState([target], 10)
    s = {
      ...s,
      factionInfluence: {
        ...s.factionInfluence,
        [FactionType.EMPEROR]: { ...s.factionInfluence[FactionType.EMPEROR], 0: 3 },
      },
    }
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9215 })

    expect(s.factionInfluence[FactionType.EMPEROR][0]).toBe(4)
    expect(s.players[0].troops).toBe(10) // 8 garrison + 2 from Emperor 4th-influence milestone
  })
})

describe('ACQUIRE_AL / ACQUIRE_SMF (reserve decks)', () => {
  it('ACQUIRE_AL costs 2 persuasion and moves the top reserve card to the discard pile', () => {
    let s = getBaseTestState({ persuasion: 3 })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0 } }
    const sizeBefore = s.arrakisLiaisonDeck.length
    const topCard = s.arrakisLiaisonDeck[sizeBefore - 1]
    s = applyGameAction(s, { type: 'ACQUIRE_AL', playerId: 0 })

    expect(s.players[0].persuasion).toBe(1)
    expect(s.arrakisLiaisonDeck.length).toBe(sizeBefore - 1)
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([topCard.id])
    expect(s.currTurn?.acquiredCards?.map(c => c.id)).toEqual([topCard.id])
    expect(s.gains).toContainEqual(
      expect.objectContaining({
        sourceId: topCard.id,
        type: RewardType.CARD,
        amount: 1,
        name: 'Arrakis Liaison',
      })
    )
  })

  it('ACQUIRE_AL with insufficient persuasion leaves the state unchanged', () => {
    let s = getBaseTestState({ persuasion: 1 })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0 } }
    expect(applyGameAction(s, { type: 'ACQUIRE_AL', playerId: 0 })).toBe(s)
  })

  it('ACQUIRE_SMF costs 9 persuasion and grants 1 victory point', () => {
    let s = getBaseTestState({ persuasion: 9 })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0 } }
    const sizeBefore = s.spiceMustFlowDeck.length
    const topCard = s.spiceMustFlowDeck[sizeBefore - 1]
    s = applyGameAction(s, { type: 'ACQUIRE_SMF', playerId: 0 })

    expect(s.players[0].persuasion).toBe(0)
    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.spiceMustFlowDeck.length).toBe(sizeBefore - 1)
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([topCard.id])
    expect(s.currTurn?.acquiredCards?.map(c => c.id)).toEqual([topCard.id])
    expect(s.currTurn?.smfDiscount).toBe(false)
    expect(s.gains).toContainEqual(
      expect.objectContaining({ type: RewardType.VICTORY_POINTS, amount: 1, sourceId: topCard.id })
    )
    expect(s.gains).toContainEqual(
      expect.objectContaining({ type: RewardType.CARD, amount: 1, sourceId: topCard.id })
    )
  })

  it('ACQUIRE_SMF with the smfDiscount flag costs 6 and clears the flag', () => {
    let s = getBaseTestState({ persuasion: 6 })
    s = {
      ...s,
      currTurn: { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0, smfDiscount: true },
    }
    s = applyGameAction(s, { type: 'ACQUIRE_SMF', playerId: 0 })

    expect(s.players[0].persuasion).toBe(0)
    expect(s.players[0].victoryPoints).toBe(1)
    expect(s.currTurn?.smfDiscount).toBe(false)
  })

  it('ACQUIRE_SMF with insufficient persuasion leaves the state unchanged', () => {
    let s = getBaseTestState({ persuasion: 8 })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0 } }
    expect(applyGameAction(s, { type: 'ACQUIRE_SMF', playerId: 0 })).toBe(s)
  })
})

describe('SELECT_IMPERIUM_REPLACEMENT / RESET_IMPERIUM_ROW', () => {
  it('SELECT_IMPERIUM_REPLACEMENT consumes the pending marker and restores the row to 5', () => {
    const row = [9211, 9212, 9213, 9214, 9215].map(id => stubDeckCard(id, { cost: 1 }))
    let s = rowState(row, 5)
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9213 })
    expect(s.imperiumRow).toHaveLength(4)
    expect(s.pendingImperiumRowReplacement).toEqual({ cardIndex: 2 })

    const replacement = s.imperiumRowDeck[0]
    const deckSizeBefore = s.imperiumRowDeck.length
    s = applyGameAction(s, { type: 'SELECT_IMPERIUM_REPLACEMENT', cardId: replacement.id })

    expect(s.imperiumRow.map(c => c.id)).toEqual([9211, 9212, replacement.id, 9214, 9215])
    expect(s.imperiumRowDeck.length).toBe(deckSizeBefore - 1)
    expect(s.pendingImperiumRowReplacement).toBeNull()
  })

  it('SELECT_IMPERIUM_REPLACEMENT without a pending replacement is ignored', () => {
    const s = rowState([stubDeckCard(9216, { cost: 1 })], 0)
    const someDeckCardId = s.imperiumRowDeck[0].id
    expect(
      applyGameAction(s, { type: 'SELECT_IMPERIUM_REPLACEMENT', cardId: someDeckCardId })
    ).toBe(s)
  })

  it('RESET_IMPERIUM_ROW replaces the row with the given imperium deck card ids', () => {
    const oldRowCard = stubDeckCard(9221, { cost: 1 })
    let s = rowState([oldRowCard], 0)

    // First five distinct-id cards from the imperium deck
    const picks: Card[] = []
    for (const c of s.imperiumRowDeck) {
      if (!picks.some(p => p.id === c.id)) picks.push(c)
      if (picks.length === 5) break
    }
    const pickIds = picks.map(c => c.id)
    const expectedRemaining = s.imperiumRowDeck.filter(c => !pickIds.includes(c.id)).length

    s = applyGameAction(s, { type: 'RESET_IMPERIUM_ROW', cardIds: pickIds })

    expect(s.imperiumRow.map(c => c.id)).toEqual(pickIds)
    expect(s.imperiumRowDeck.length).toBe(expectedRemaining)
    // NOTE: current behavior — cards previously in the row are dropped from circulation,
    // not returned to the imperium deck
    expect(s.imperiumRowDeck.some(c => c.id === 9221)).toBe(false)
  })

  it('RESET_IMPERIUM_ROW with unknown ids or an empty list is ignored', () => {
    const s = rowState([stubDeckCard(9222, { cost: 1 })], 0)
    expect(applyGameAction(s, { type: 'RESET_IMPERIUM_ROW', cardIds: [999999] })).toBe(s)
    expect(applyGameAction(s, { type: 'RESET_IMPERIUM_ROW', cardIds: [] })).toBe(s)
  })
})

describe('END_TURN after reveal', () => {
  it('moves agent + reveal cards to the discard pile, zeroes persuasion, and ends the round phase', () => {
    const agentCard = stubDeckCard(9301, { agentIcons: [AgentIcon.CITY] })
    const revealCard = stubDeckCard(9302, { revealEffect: [{ reward: { persuasion: 2 } }] })
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, revealed: true } : p)) }
    s = withCardOnTop(s, 0, revealCard)
    s = withCardOnTop(s, 0, agentCard)

    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 9301 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    // Player 1 is already revealed, so the turn comes back to player 0
    expect(s.activePlayerId).toBe(0)
    expect(s.players[0].playArea.map(c => c.id)).toEqual([9301])

    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [9302] })
    expect(s.players[0].playArea.map(c => c.id)).toEqual([9301, 9302])
    expect(s.players[0].persuasion).toBe(2)
    expect(s.players[0].revealed).toBe(true)

    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    const p = s.players[0]
    expect(p.discardPile.map(c => c.id)).toEqual([9301, 9302])
    expect(p.playArea).toEqual([])
    expect(p.persuasion).toBe(0)
    // NOTE: current behavior — with all players revealed and no troops in conflict,
    // the COMBAT phase is skipped entirely and play jumps to COMBAT_REWARDS
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)
    expect(s.activePlayerId).toBe(0)
    expect(s.currTurn).toBeNull()
    expect(s.gains).toEqual([])
    expect(s.pendingRewards).toEqual([])
    expect(s.canEndTurn).toBe(false)
  })

  it('subsequent END_TURN skips players who already revealed', () => {
    let s = getBaseTestState(undefined, { players: 3, activeId: 0 })
    s = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, revealed: true } : p)) }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [] })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    expect(s.activePlayerId).toBe(2) // player 1 (revealed) is skipped
    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.currTurn).toBeNull()
    expect(s.canEndTurn).toBe(false)
  })

  it('all players revealed with troops and intrigue in conflict moves to COMBAT', () => {
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = {
      ...s,
      players: s.players.map((p, i) => (i === 1 ? { ...p, revealed: true } : p)),
      combatTroops: { 0: 1, 1: 1 },
      combatStrength: { 0: 2, 1: 2 },
    }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [] })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    expect(s.phase).toBe(GamePhase.COMBAT)
    expect(s.activePlayerId).toBe(0) // first player marker, eligible for combat intrigue
    expect(s.combatPasses.size).toBe(0)
    expect(s.currTurn).toBeNull()
    expect(s.gains).toEqual([])
    expect(s.pendingRewards).toEqual([])
  })
})
