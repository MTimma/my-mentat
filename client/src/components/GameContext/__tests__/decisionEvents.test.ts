/**
 * Decision events (plans/reducer/02-deterministic-ids.md):
 * - RESOLVE_CHOICE / RESOLVE_CONFLICT_REWARD_CHOICE carry `optionIndex`
 *   (decision), not the Reward payload (outcome).
 * - PAY_COST carries `effectId` (+ per-decision `data`), not the embedded effect.
 * The legacy reward/effect payloads remain accepted for back-compat.
 */
import { describe, expect, it } from 'vitest'
import {
  ChoiceType,
  FixedOptionsChoice,
  GainSource,
  GamePhase,
  GameState,
  OptionalEffect,
  TurnType,
} from '../../../types/GameTypes'
import { applyGameAction } from '../GameContext'
import { getBaseTestState, stubDeckCard } from './_helpers'

function withFixedChoice(
  state: GameState,
  choice: Partial<FixedOptionsChoice> & Pick<FixedOptionsChoice, 'id' | 'options'>
): GameState {
  const fullChoice: FixedOptionsChoice = {
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Choose one',
    source: { type: GainSource.CARD, id: 42, name: 'Test Card' },
    ...choice,
  }
  return {
    ...state,
    currTurn: {
      playerId: 0,
      type: TurnType.ACTION,
      pendingChoices: [fullChoice],
    },
    canEndTurn: false,
  }
}

function withOptionalEffect(state: GameState, effect: OptionalEffect): GameState {
  return {
    ...state,
    currTurn: {
      playerId: 0,
      type: TurnType.ACTION,
      optionalEffects: [effect],
    },
  }
}

describe('RESOLVE_CHOICE with optionIndex', () => {
  const options = [
    { reward: { spice: 2 } },
    { reward: { water: 1 } },
    { reward: { solari: 3 }, disabled: true },
  ]

  it('applies the selected option reward and removes the choice', () => {
    const s0 = withFixedChoice(getBaseTestState(), { id: 'card-42-OR', options })
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: 'card-42-OR',
      optionIndex: 1,
    })
    expect(s1.players[0].water).toBe(s0.players[0].water + 1)
    expect(s1.players[0].spice).toBe(s0.players[0].spice)
    expect(s1.currTurn?.pendingChoices ?? []).toHaveLength(0)
    expect(s1.canEndTurn).toBe(true)
  })

  it('rejects a disabled option', () => {
    const s0 = withFixedChoice(getBaseTestState(), { id: 'card-42-OR', options })
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: 'card-42-OR',
      optionIndex: 2,
    })
    expect(s1).toBe(s0)
  })

  it('rejects an out-of-range optionIndex', () => {
    const s0 = withFixedChoice(getBaseTestState(), { id: 'card-42-OR', options })
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: 'card-42-OR',
      optionIndex: 5,
    })
    expect(s1).toBe(s0)
  })

  it('rejects optionIndex when the choice id does not match a fixed-options choice', () => {
    const s0 = withFixedChoice(getBaseTestState(), { id: 'card-42-OR', options })
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: 'card-42-OR-1',
      optionIndex: 0,
    })
    expect(s1).toBe(s0)
  })

  it('still accepts the legacy reward payload', () => {
    const s0 = withFixedChoice(getBaseTestState(), { id: 'card-42-OR', options })
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: 'card-42-OR',
      reward: { spice: 2 },
    })
    expect(s1.players[0].spice).toBe(s0.players[0].spice + 2)
    expect(s1.currTurn?.pendingChoices ?? []).toHaveLength(0)
  })

  it('rejects an action with neither optionIndex nor reward', () => {
    const s0 = withFixedChoice(getBaseTestState(), { id: 'card-42-OR', options })
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: 'card-42-OR',
    })
    expect(s1).toBe(s0)
  })
})

describe('PAY_COST with effectId', () => {
  const effect: OptionalEffect = {
    id: 'card-7-EFFECT',
    cost: { spice: 2 },
    reward: { troops: 3 },
    source: { type: GainSource.CARD, id: 7, name: 'Fremen Camp' },
  }

  it('resolves the live optional effect by id', () => {
    const s0 = withOptionalEffect(getBaseTestState({ spice: 5, troops: 2 }), effect)
    const s1 = applyGameAction(s0, { type: 'PAY_COST', playerId: 0, effectId: 'card-7-EFFECT' })
    expect(s1.players[0].spice).toBe(3)
    expect(s1.players[0].troops).toBe(5)
    expect(s1.currTurn?.optionalEffects ?? []).toHaveLength(0)
  })

  it('returns state unchanged for an unknown effectId', () => {
    const s0 = withOptionalEffect(getBaseTestState({ spice: 5 }), effect)
    const s1 = applyGameAction(s0, { type: 'PAY_COST', playerId: 0, effectId: 'card-9-EFFECT' })
    expect(s1).toBe(s0)
  })

  it('merges per-decision data (trashedCardId) into the stored effect', () => {
    const trashTarget = stubDeckCard(901)
    const base = getBaseTestState({ spice: 5, discardPile: [trashTarget] })
    const trashEffect: OptionalEffect = {
      id: 'card-8-EFFECT',
      cost: { trash: 1 },
      reward: { spice: 2 },
      source: { type: GainSource.CARD, id: 8, name: 'Trasher' },
    }
    const s0 = withOptionalEffect(base, trashEffect)
    const s1 = applyGameAction(s0, {
      type: 'PAY_COST',
      playerId: 0,
      effectId: 'card-8-EFFECT',
      data: { trashedCardId: 901 },
    })
    expect(s1.players[0].discardPile.find(c => c.id === 901)).toBeUndefined()
    expect(s1.players[0].trash.some(c => c.id === 901)).toBe(true)
    expect(s1.players[0].spice).toBe(7)
  })

  it('still accepts the legacy embedded effect payload', () => {
    const s0 = withOptionalEffect(getBaseTestState({ spice: 5, troops: 2 }), effect)
    const s1 = applyGameAction(s0, { type: 'PAY_COST', playerId: 0, effect })
    expect(s1.players[0].spice).toBe(3)
    expect(s1.players[0].troops).toBe(5)
  })
})

describe('RESOLVE_CONFLICT_REWARD_CHOICE with optionIndex', () => {
  function stateWithConflictChoice(): GameState {
    const base = getBaseTestState(undefined, { players: 2 })
    return {
      ...base,
      phase: GamePhase.COMBAT_REWARDS,
      pendingConflictRewardChoices: [
        {
          id: 'conflict-901-CONFLICT-REWARD-first-p0',
          playerId: 0,
          placement: 'first',
          conflictId: 901,
          conflictName: 'Skirmish',
          options: [{ reward: { spice: 3 } }, { reward: { water: 2 } }],
        },
      ],
    }
  }

  it('applies the selected option by index', () => {
    const s0 = stateWithConflictChoice()
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CONFLICT_REWARD_CHOICE',
      choiceId: 'conflict-901-CONFLICT-REWARD-first-p0',
      optionIndex: 1,
    })
    expect(s1.players[0].water).toBe(s0.players[0].water + 2)
    expect(s1.pendingConflictRewardChoices).toBeUndefined()
  })

  it('rejects out-of-range optionIndex', () => {
    const s0 = stateWithConflictChoice()
    const s1 = applyGameAction(s0, {
      type: 'RESOLVE_CONFLICT_REWARD_CHOICE',
      choiceId: 'conflict-901-CONFLICT-REWARD-first-p0',
      optionIndex: 9,
    })
    expect(s1).toBe(s0)
  })
})
