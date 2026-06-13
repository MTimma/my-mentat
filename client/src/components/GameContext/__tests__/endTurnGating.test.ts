import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { IMPERIUM_ROW_DECK } from '../../../data/cards'
import {
  AgentIcon,
  CardPile,
  ChoiceType,
  GainSource,
  GamePhase,
  RewardType,
  TurnType,
  type CardSelectChoice,
  type FixedOptionsChoice,
} from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard, withCardOnTop } from './_helpers'
import { getGainsForTurnState } from '../../../utils/turnGainsDisplay'

const ARRAKEEN_ID = BOARD_SPACES.find(s => s.name === 'Arrakeen')!.id

describe('END_TURN gating — mandatory pending work blocks the turn', () => {
  it('is blocked while non-disabled pendingRewards exist (even with canEndTurn forced true)', () => {
    const card = stubDeckCard(8101, { agentIcons: [AgentIcon.CITY] })
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 8101 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })

    // Arrakeen leaves a pending drawCards reward
    expect(s.pendingRewards.some(r => !r.disabled)).toBe(true)

    // NOTE: current behavior — END_TURN ignores the canEndTurn flag entirely and
    // re-derives gating from pendingRewards / currTurn.pendingChoices itself
    const forced = { ...s, canEndTurn: true }
    expect(applyGameAction(forced, { type: 'END_TURN', playerId: 0 })).toBe(forced)

    // Claiming the rewards unblocks the turn
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.activePlayerId).toBe(1)
  })

  it('is blocked while a mandatory FIXED_OPTIONS (OR) choice is pending', () => {
    const choice: FixedOptionsChoice = {
      id: 'test-or-choice',
      type: ChoiceType.FIXED_OPTIONS,
      prompt: 'Choose one reward',
      options: [{ reward: { spice: 1 } }, { reward: { water: 1 } }],
      source: { type: GainSource.CARD, id: 8102, name: 'stub-8102' },
    }
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = {
      ...s,
      selectedCard: 8102,
      currTurn: { playerId: 0, type: TurnType.ACTION, pendingChoices: [choice] },
    }
    expect(applyGameAction(s, { type: 'END_TURN', playerId: 0 })).toBe(s)
  })

  it('is blocked while an influence choose-one choice from an acquire effect is pending', () => {
    const ladyJessica = structuredClone(IMPERIUM_ROW_DECK.find(c => c.name === 'Lady Jessica')!)
    let s = getBaseTestState({ persuasion: 10 }, { players: 2, activeId: 0 })
    s = {
      ...s,
      imperiumRow: [ladyJessica],
      currTurn: { playerId: 0, type: TurnType.REVEAL, persuasionCount: 0 },
      canEndTurn: true,
    }
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: ladyJessica.id })
    expect(s.currTurn?.pendingChoices).toHaveLength(1)
    expect(s.canEndTurn).toBe(false)

    expect(applyGameAction(s, { type: 'END_TURN', playerId: 0 })).toBe(s)
  })

  it('is blocked while a CARD_SELECT choice is pending', () => {
    const choice: CardSelectChoice = {
      id: 'test-card-select',
      type: ChoiceType.CARD_SELECT,
      prompt: 'Choose a card to trash',
      piles: [CardPile.HAND, CardPile.DISCARD],
      selectionCount: 1,
      onResolve: (cardIds: number[]) => ({ type: 'TRASH_CARD', playerId: 0, cardId: cardIds[0] }),
      source: { type: GainSource.CARD, id: 8103, name: 'stub-8103' },
    }
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = {
      ...s,
      selectedCard: 8103,
      currTurn: { playerId: 0, type: TurnType.ACTION, pendingChoices: [choice] },
    }
    expect(applyGameAction(s, { type: 'END_TURN', playerId: 0 })).toBe(s)
  })

  it('is blocked by an unclaimed optional trash pendingReward', () => {
    const card = stubDeckCard(8104, { revealEffect: [{ reward: { trash: 1 } }] })
    let s = getBaseTestState({ deck: [card], handCount: 1 }, { players: 2, activeId: 0 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [8104] })

    expect(s.pendingRewards).toHaveLength(1)
    expect(s.pendingRewards[0]).toMatchObject({ isTrash: true, reward: { trash: 1 } })
    expect(s.canEndTurn).toBe(false)

    // NOTE: current behavior — optional trash rewards are NOT exempt from the
    // pendingRewards gate; END_TURN no-ops until the reward is claimed or removed
    expect(applyGameAction(s, { type: 'END_TURN', playerId: 0 })).toBe(s)
  })

  it('disabled pendingRewards do not block END_TURN', () => {
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [] })
    s = {
      ...s,
      pendingRewards: [
        {
          id: 'disabled-reward',
          source: { type: GainSource.CARD, id: 8105, name: 'stub-8105' },
          reward: { spice: 1 },
          isTrash: false,
          disabled: true,
        },
      ],
    }
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.activePlayerId).toBe(1)
    expect(s.currTurn).toBeNull()
  })
})

describe('END_TURN gating — optional effects lapse silently', () => {
  it('proceeds with unresolved optionalEffects; the cost-reward simply lapses', () => {
    const card = stubDeckCard(8111, {
      revealEffect: [{ cost: { spice: 2 }, reward: { troops: 3 } }],
    })
    let s = getBaseTestState({ deck: [card], handCount: 1 }, { players: 2, activeId: 0 })
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [8111] })
    expect(s.currTurn?.optionalEffects).toHaveLength(1)

    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    expect(s.activePlayerId).toBe(1)
    expect(s.currTurn).toBeNull()
    // Neither cost paid nor reward gained
    expect(s.players[0].spice).toBe(10)
    expect(s.players[0].troops).toBe(8)
  })
})

describe('END_TURN gating — basic preconditions', () => {
  it('no-ops for a non-active player', () => {
    const s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    expect(applyGameAction(s, { type: 'END_TURN', playerId: 1 })).toBe(s)
  })

  it('no-ops on an agent turn before a card was played (no selectedCard)', () => {
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = { ...s, currTurn: { playerId: 0, type: TurnType.ACTION }, selectedCard: null }
    expect(applyGameAction(s, { type: 'END_TURN', playerId: 0 })).toBe(s)
  })
})

describe('END_TURN — turn rotation and phase transition', () => {
  it('advances activePlayerId to the next non-revealed player', () => {
    let s = getBaseTestState(undefined, { players: 3, activeId: 0 })
    s = { ...s, players: s.players.map((p, i) => (i === 1 ? { ...p, revealed: true } : p)) }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [] })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    expect(s.activePlayerId).toBe(2)
    expect(s.phase).toBe(GamePhase.PLAYER_TURNS)
    expect(s.currTurn).toBeNull()
    expect(s.canEndTurn).toBe(false)
    expect(s.gains).toEqual([])
    expect(s.pendingRewards).toEqual([])
  })

  it('with 2 players both revealed and no combat troops, jumps to COMBAT_REWARDS', () => {
    let s = getBaseTestState(undefined, { players: 2, activeId: 1 })
    s = { ...s, players: s.players.map((p, i) => (i === 0 ? { ...p, revealed: true } : p)) }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 1, cardIds: [] })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 1 })

    // NOTE: current behavior — when no player has both troops in conflict and an
    // intrigue card, the COMBAT phase is skipped and play moves straight to
    // COMBAT_REWARDS with activePlayerId reset to 0
    expect(s.phase).toBe(GamePhase.COMBAT_REWARDS)
    expect(s.activePlayerId).toBe(0)
    expect(s.combatPasses.size).toBe(0)
    expect(s.currTurn).toBeNull()
    expect(s.gains).toEqual([])
    expect(s.pendingRewards).toEqual([])
  })

  it('with 2 players both revealed and troops + intrigue, enters COMBAT', () => {
    let s = getBaseTestState(undefined, { players: 2, activeId: 1 })
    s = {
      ...s,
      players: s.players.map((p, i) => (i === 0 ? { ...p, revealed: true } : p)),
      combatTroops: { 0: 2, 1: 1 },
      combatStrength: { 0: 4, 1: 2 },
    }
    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 1, cardIds: [] })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 1 })

    expect(s.phase).toBe(GamePhase.COMBAT)
    expect(s.activePlayerId).toBe(0) // first eligible player from the first-player marker
    expect(s.combatPasses.size).toBe(0)
    expect(s.currTurn).toBeNull()
  })
})

describe('END_TURN — gains scoping', () => {
  it('resets state.gains and snapshots only this turn gains with gainsStartIndex 0', () => {
    const card = stubDeckCard(8121, { agentIcons: [AgentIcon.CITY] })
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = withCardOnTop(s, 0, card)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 8121 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })

    const gainsBeforeEnd = getGainsForTurnState(s)
    expect(gainsBeforeEnd.length).toBeGreaterThan(0)
    expect(s.currTurn?.gainsStartIndex).toBe(0)

    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    expect(s.gains).toEqual([])
    expect(s.currTurn).toBeNull()

    const snapshot = s.history[s.history.length - 1]
    expect(snapshot.currTurn?.gainsStartIndex).toBe(0)
    expect(snapshot.gains).toEqual(gainsBeforeEnd)
    expect(snapshot.gains.map(g => g.type)).toContain(RewardType.TROOPS)
  })

  it('a later turn starts its gains scope at the reset gains array', () => {
    const cardA = stubDeckCard(8122, { agentIcons: [AgentIcon.CITY] })
    const cardB = stubDeckCard(8123, { agentIcons: [AgentIcon.CITY] })
    let s = getBaseTestState(undefined, { players: 2, activeId: 0 })
    s = withCardOnTop(s, 0, cardA)
    s = withCardOnTop(s, 1, cardB)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: 8122 })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: ARRAKEEN_ID })
    s = applyGameAction(s, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })

    expect(s.activePlayerId).toBe(1)
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 1, cardId: 8123 })
    expect(s.currTurn?.gainsStartIndex).toBe(0) // gains were reset by END_TURN
    expect(getGainsForTurnState(s)).toHaveLength(0)
  })
})
