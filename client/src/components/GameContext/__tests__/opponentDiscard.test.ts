import { describe, it, expect } from 'vitest'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import {
  CustomEffect,
  FactionType,
  GainSource,
  RewardType,
  type Card,
  type GameState,
  type Player,
} from '../../../types/GameTypes'

const HALL_OF_ORATORY_ID = BOARD_SPACES.find(s => s.name === 'Hall of Oratory')!.id
const SECRETS_ID = BOARD_SPACES.find(s => s.name === 'Secrets')!.id

function imperiumCard(name: string): Card {
  const card = IMPERIUM_ROW_DECK.find(c => c.name === name)
  if (!card) throw new Error(`${name} not found in IMPERIUM_ROW_DECK`)
  return structuredClone(card)
}

/**
 * 3 players. Opponents 1 and 2 each get 3 stub cards: ids x01/x02 in hand
 * (handCount 2) and x03 in the draw pile.
 */
function threePlayerState(
  p0Overrides?: Partial<Player>,
  opponentPatch?: (p: Player) => Player
): GameState {
  let s = getBaseTestState(p0Overrides, { players: 3 })
  s = {
    ...s,
    players: s.players.map(p => {
      if (p.id === 0) return p
      const patched: Player = {
        ...p,
        deck: [stubDeckCard(p.id * 100 + 1), stubDeckCard(p.id * 100 + 2), stubDeckCard(p.id * 100 + 3)],
        handCount: 2,
      }
      return opponentPatch ? opponentPatch(patched) : patched
    }),
  }
  return s
}

/** Plays Test of Humanity organically and claims its custom effect. */
function triggerTestOfHumanity(base?: GameState): GameState {
  const toh = imperiumCard('Test of Humanity')
  let s = base ?? threePlayerState()
  s = withCardOnTop(s, 0, toh)
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: toh.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: HALL_OF_ORATORY_ID })
  // Claim the custom effect first: CLAIM_ALL_REWARDS drops unapplied custom rewards.
  const custom = s.pendingRewards.find(r => r.reward.custom === CustomEffect.TEST_OF_HUMANITY)
  expect(custom).toBeDefined()
  s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: custom!.id })
  s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
  return s
}

/** Plays Reverend Mother Mohiam organically (with another BG card in play) and claims it. */
function triggerMohiam(base?: GameState): GameState {
  const mohiam = imperiumCard('Reverend Mother Mohiam')
  const bgInPlay = stubDeckCard(666, { faction: [FactionType.BENE_GESSERIT] })
  let s = base ?? threePlayerState({ playArea: [bgInPlay] })
  s = withCardOnTop(s, 0, mohiam)
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: mohiam.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SECRETS_ID })
  // Claim the custom effect first: CLAIM_ALL_REWARDS drops unapplied custom rewards.
  const custom = s.pendingRewards.find(r => r.reward.custom === CustomEffect.REVEREND_MOTHER_MOHIAM)
  expect(custom).toBeDefined()
  expect(custom!.disabled).toBeUndefined()
  s = applyGameAction(s, { type: 'CLAIM_REWARD', playerId: 0, rewardId: custom!.id })
  s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
  return s
}

describe('Test of Humanity — opponent discard-or-lose-troop flow', () => {
  it('claiming the custom effect initializes opponentDiscardState with the first opponent current', () => {
    const s = triggerTestOfHumanity()
    expect(s.currTurn?.opponentDiscardState).toEqual({
      effect: CustomEffect.TEST_OF_HUMANITY,
      remainingOpponents: [1, 2],
      currentOpponent: 1,
      discardCounts: { 1: 0, 2: 0 },
    })
    // All non-disabled rewards were claimed before the custom effect.
    expect(s.pendingRewards.filter(r => !r.disabled)).toEqual([])
  })

  it('END_TURN is blocked while opponentDiscardState exists', () => {
    const s = triggerTestOfHumanity()
    const after = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(after).toBe(s)
  })

  it("OPPONENT_DISCARD_CHOICE 'loseTroop' removes a conflict troop back to the opponent's troop pool", () => {
    let s = triggerTestOfHumanity()
    s = {
      ...s,
      combatTroops: { 1: 2 },
      combatStrength: { 1: 4 },
      players: s.players.map(p => (p.id === 1 ? { ...p, combatValue: 4 } : p)),
    }
    const after = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CHOICE',
      playerId: 0,
      opponentId: 1,
      choice: 'loseTroop',
    })

    // NOTE: current behavior — the lost troop returns to the opponent's troops pool
    // (garrison/supply counter), it is not removed from the game.
    expect(after.combatTroops[1]).toBe(1)
    expect(after.combatStrength[1]).toBe(2)
    expect(after.players[1].troops).toBe(9)
    expect(after.players[1].combatValue).toBe(2)
    // Opponent 1 is done; flow advances to opponent 2.
    expect(after.currTurn?.opponentDiscardState).toEqual({
      effect: CustomEffect.TEST_OF_HUMANITY,
      remainingOpponents: [2],
      currentOpponent: 2,
      discardCounts: { 1: 0, 2: 0 },
    })
    expect(after.canEndTurn).toBe(false)
  })

  it("'loseTroop' with no troops in the conflict leaves state unchanged", () => {
    const s = triggerTestOfHumanity() // opponent 1 has no combatTroops
    const after = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CHOICE',
      playerId: 0,
      opponentId: 1,
      choice: 'loseTroop',
    })
    expect(after).toBe(s)
  })

  it("'discard' choice is a no-op; OPPONENT_DISCARD_CARD performs the discard and advances", () => {
    const s = triggerTestOfHumanity()

    // NOTE: current behavior — choosing 'discard' returns the state untouched;
    // the actual discard happens via the follow-up OPPONENT_DISCARD_CARD action.
    const afterChoice = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CHOICE',
      playerId: 0,
      opponentId: 1,
      choice: 'discard',
    })
    expect(afterChoice).toBe(s)

    let after = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CARD',
      playerId: 0,
      opponentId: 1,
      cardId: 101,
    })
    expect(after.players[1].deck.map(c => c.id)).toEqual([102, 103])
    expect(after.players[1].handCount).toBe(1)
    expect(after.players[1].discardPile.map(c => c.id)).toEqual([101])
    expect(after.gains).toContainEqual({
      round: s.currentRound,
      playerId: 1,
      sourceId: 101,
      name: 'stub-101',
      amount: -1,
      type: RewardType.DISCARD,
      source: GainSource.CARD,
    })
    // Required discards for Test of Humanity is 1, so opponent 1 is done.
    expect(after.currTurn?.opponentDiscardState).toEqual({
      effect: CustomEffect.TEST_OF_HUMANITY,
      remainingOpponents: [2],
      currentOpponent: 2,
      discardCounts: { 1: 1, 2: 0 },
    })
    expect(after.canEndTurn).toBe(false)

    // Opponent 2 discards; flow completes and the turn can end.
    after = applyGameAction(after, {
      type: 'OPPONENT_DISCARD_CARD',
      playerId: 0,
      opponentId: 2,
      cardId: 201,
    })
    expect(after.players[2].discardPile.map(c => c.id)).toEqual([201])
    expect(after.players[2].handCount).toBe(1)
    expect(after.currTurn?.opponentDiscardState).toBeUndefined()
    expect(after.canEndTurn).toBe(true)
  })

  it('rejects discards out of turn order, by a non-active player, or for unknown cards', () => {
    const s = triggerTestOfHumanity() // currentOpponent is 1

    // Opponent 2 cannot discard before opponent 1.
    expect(
      applyGameAction(s, { type: 'OPPONENT_DISCARD_CARD', playerId: 0, opponentId: 2, cardId: 201 })
    ).toBe(s)
    // Acting player must be the active player.
    expect(
      applyGameAction(s, { type: 'OPPONENT_DISCARD_CARD', playerId: 1, opponentId: 1, cardId: 101 })
    ).toBe(s)
    // Card must exist in the opponent's deck.
    expect(
      applyGameAction(s, { type: 'OPPONENT_DISCARD_CARD', playerId: 0, opponentId: 1, cardId: 999 })
    ).toBe(s)
  })

  it('allows discarding a card from the draw pile (deck index >= handCount): handCount unchanged', () => {
    const s = triggerTestOfHumanity()
    // NOTE: current behavior — any deck card not in play is discardable, including
    // draw-pile cards below the hand; handCount stays untouched in that case.
    const after = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CARD',
      playerId: 0,
      opponentId: 1,
      cardId: 103,
    })
    expect(after.players[1].deck.map(c => c.id)).toEqual([101, 102])
    expect(after.players[1].handCount).toBe(2)
    expect(after.players[1].discardPile.map(c => c.id)).toEqual([103])
    expect(after.currTurn?.opponentDiscardState?.discardCounts).toEqual({ 1: 1, 2: 0 })
  })
})

describe('Reverend Mother Mohiam — opponent discard-2 flow', () => {
  it('initializes opponentDiscardState with no current opponent and source card attribution', () => {
    const s = triggerMohiam()
    expect(s.currTurn?.opponentDiscardState).toEqual({
      effect: CustomEffect.REVEREND_MOTHER_MOHIAM,
      remainingOpponents: [1, 2],
      currentOpponent: undefined,
      discardCounts: { 1: 0, 2: 0 },
      sourceCardId: 1043,
      sourceCardName: 'Reverend Mother Mohiam',
    })
  })

  it('pendingReward is created disabled when no other Bene Gesserit card is in play', () => {
    const mohiam = imperiumCard('Reverend Mother Mohiam')
    let s = threePlayerState() // empty play area
    s = withCardOnTop(s, 0, mohiam)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: mohiam.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: SECRETS_ID })

    const custom = s.pendingRewards.find(r => r.reward.custom === CustomEffect.REVEREND_MOTHER_MOHIAM)
    expect(custom?.disabled).toBe(true)
  })

  it('excludes opponents without discardable cards when initializing', () => {
    const base = threePlayerState({ playArea: [stubDeckCard(666, { faction: [FactionType.BENE_GESSERIT] })] }, p =>
      p.id === 2 ? { ...p, deck: [], handCount: 0 } : p
    )
    const s = triggerMohiam(base)
    expect(s.currTurn?.opponentDiscardState?.remainingOpponents).toEqual([1])
    expect(s.currTurn?.opponentDiscardState?.discardCounts).toEqual({ 1: 0 })
  })

  it("OPPONENT_DISCARD_CHOICE 'discard' selects the current opponent; OPPONENT_DISCARD_CARDS discards 2 and advances", () => {
    let s = triggerMohiam()

    s = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CHOICE',
      playerId: 0,
      opponentId: 2,
      choice: 'discard',
    })
    expect(s.currTurn?.opponentDiscardState?.currentOpponent).toBe(2)
    expect(s.currTurn?.opponentDiscardState?.remainingOpponents).toEqual([1, 2])

    s = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CARDS',
      playerId: 0,
      opponentId: 2,
      cardIds: [201, 202],
    })
    expect(s.players[2].deck.map(c => c.id)).toEqual([203])
    expect(s.players[2].handCount).toBe(0)
    expect(s.players[2].discardPile.map(c => c.id)).toEqual([201, 202])
    // Opponent 2 done (2 discards); single remaining opponent becomes current automatically.
    expect(s.currTurn?.opponentDiscardState).toMatchObject({
      remainingOpponents: [1],
      currentOpponent: 1,
      discardCounts: { 1: 0, 2: 2 },
    })
    expect(s.canEndTurn).toBe(false)

    s = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CARDS',
      playerId: 0,
      opponentId: 1,
      cardIds: [101, 102],
    })
    expect(s.players[1].discardPile.map(c => c.id)).toEqual([101, 102])
    expect(s.currTurn?.opponentDiscardState).toBeUndefined()
    expect(s.canEndTurn).toBe(true)
  })

  it('OPPONENT_DISCARD_CARDS without a selected current opponent leaves state unchanged', () => {
    const s = triggerMohiam() // currentOpponent undefined
    const after = applyGameAction(s, {
      type: 'OPPONENT_DISCARD_CARDS',
      playerId: 0,
      opponentId: 1,
      cardIds: [101, 102],
    })
    expect(after).toBe(s)
  })

  it('discarding one card at a time keeps the opponent current until 2 are discarded', () => {
    let s = triggerMohiam()
    s = applyGameAction(s, { type: 'OPPONENT_DISCARD_CHOICE', playerId: 0, opponentId: 1, choice: 'discard' })

    s = applyGameAction(s, { type: 'OPPONENT_DISCARD_CARD', playerId: 0, opponentId: 1, cardId: 101 })
    expect(s.currTurn?.opponentDiscardState).toMatchObject({
      remainingOpponents: [1, 2],
      currentOpponent: 1,
      discardCounts: { 1: 1, 2: 0 },
    })

    s = applyGameAction(s, { type: 'OPPONENT_DISCARD_CARD', playerId: 0, opponentId: 1, cardId: 102 })
    expect(s.players[1].discardPile.map(c => c.id)).toEqual([101, 102])
    // Opponent 1 done; opponent 2 is the single remaining and becomes current.
    expect(s.currTurn?.opponentDiscardState).toMatchObject({
      remainingOpponents: [2],
      currentOpponent: 2,
      discardCounts: { 1: 2, 2: 0 },
    })
  })

  it('an opponent whose deck empties after one discard is considered complete', () => {
    const base = threePlayerState({ playArea: [stubDeckCard(666, { faction: [FactionType.BENE_GESSERIT] })] }, p =>
      p.id === 1 ? { ...p, deck: [stubDeckCard(101)], handCount: 1 } : p
    )
    let s = triggerMohiam(base)
    s = applyGameAction(s, { type: 'OPPONENT_DISCARD_CHOICE', playerId: 0, opponentId: 1, choice: 'discard' })
    s = applyGameAction(s, { type: 'OPPONENT_DISCARD_CARD', playerId: 0, opponentId: 1, cardId: 101 })

    // Only 1 of the required 2 discarded, but the deck is empty, so opponent 1 is done.
    expect(s.players[1].deck).toEqual([])
    expect(s.currTurn?.opponentDiscardState).toMatchObject({
      remainingOpponents: [2],
      currentOpponent: 2,
      discardCounts: { 1: 1, 2: 0 },
    })
  })

  it('OPPONENT_NO_CARD_ACK skips an opponent with an empty hand and advances the flow', () => {
    // Opponent 1 has cards in the draw pile (discardable) but an empty hand.
    const base = threePlayerState({ playArea: [stubDeckCard(666, { faction: [FactionType.BENE_GESSERIT] })] }, p =>
      p.id === 1 ? { ...p, handCount: 0 } : p
    )
    let s = triggerMohiam(base)
    expect(s.currTurn?.opponentDiscardState?.remainingOpponents).toEqual([1, 2])

    // ACK is rejected while the opponent still has cards in hand.
    expect(
      applyGameAction(s, { type: 'OPPONENT_NO_CARD_ACK', playerId: 0, opponentId: 2 })
    ).toBe(s)

    s = applyGameAction(s, { type: 'OPPONENT_NO_CARD_ACK', playerId: 0, opponentId: 1 })
    // NOTE: current behavior — the acknowledged opponent is marked with discardCounts = 2
    // even though nothing was discarded; their piles are untouched.
    expect(s.players[1].deck.map(c => c.id)).toEqual([101, 102, 103])
    expect(s.players[1].discardPile).toEqual([])
    expect(s.currTurn?.opponentDiscardState).toMatchObject({
      remainingOpponents: [2],
      currentOpponent: 2,
      discardCounts: { 1: 2, 2: 0 },
    })
  })

  it('OPPONENT_NO_CARD_ACK is rejected for the Test of Humanity effect', () => {
    const base = threePlayerState(undefined, p =>
      p.id === 1 ? { ...p, handCount: 0 } : p
    )
    const s = triggerTestOfHumanity(base)
    const after = applyGameAction(s, { type: 'OPPONENT_NO_CARD_ACK', playerId: 0, opponentId: 1 })
    expect(after).toBe(s)
  })
})
