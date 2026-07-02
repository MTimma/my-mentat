import { describe, expect, it } from 'vitest'
import { applyGameAction } from '../../components/GameContext/GameContext'
import { buildInitialState } from '../buildInitialState'
import { shouldRecordEvent, buildEventRecordContext, turnNumberFromRecordedEvents } from '../recording'
import { GamePhase, PlayerColor } from '../../types/GameTypes'
import type { EventEntry } from '../types'

describe('shouldRecordEvent', () => {
  it('rejects no-op reducer steps', () => {
    const state = buildInitialState({
      firstPlayer: 0,
      players: [{ id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: ['starting/diplomacy'] }],
    })
    const action = { type: 'END_TURN' as const, playerId: 1 }
    expect(shouldRecordEvent(state, state, action, undefined)).toBe(false)
  })

  it('rejects consecutive duplicate END_TURN entries', () => {
    const state = buildInitialState({
      firstPlayer: 0,
      players: [{ id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: ['starting/diplomacy'] }],
    })
    const next = { ...state, phase: GamePhase.COMBAT }
    const action = { type: 'END_TURN' as const, playerId: 0 }
    const last: EventEntry = { a: action }
    expect(shouldRecordEvent(state, next, action, last)).toBe(false)
  })

  it('allows consecutive DEPLOY_TROOP entries', () => {
    const state = buildInitialState({
      firstPlayer: 0,
      players: [{ id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: ['starting/diplomacy'] }],
    })
    const action = { type: 'DEPLOY_TROOP' as const, playerId: 0 }
    const last: EventEntry = { a: action }
    const changed = { ...state, combatTroops: { 0: 1 } }
    expect(shouldRecordEvent(state, changed, action, last)).toBe(true)
    expect(shouldRecordEvent(state, changed, action, { a: { type: 'END_TURN', playerId: 0 } })).toBe(
      true
    )
  })
})

describe('buildEventRecordContext', () => {
  it('stamps round, active player, and turn sequence', () => {
    const state = {
      ...buildInitialState({
        firstPlayer: 0,
        players: [{ id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: ['starting/diplomacy'] }],
        currentRound: 3,
      }),
      activePlayerId: 2,
      phase: GamePhase.PLAYER_TURNS,
    }
    const prior: EventEntry[] = [
      { a: { type: 'END_TURN', playerId: 0 } },
      { a: { type: 'END_TURN', playerId: 1 } },
    ]
    expect(buildEventRecordContext(state, prior)).toEqual({
      round: 3,
      activePlayerId: 2,
      turn: 3,
    })
    expect(turnNumberFromRecordedEvents([])).toBe(1)
  })
})

describe('CLAIM_ALL_REWARDS no-op', () => {
  it('returns the same state reference when there is nothing to auto-apply', () => {
    const state = buildInitialState({
      firstPlayer: 0,
      players: [{ id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: ['starting/diplomacy'] }],
    })
    const after = applyGameAction(state, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(after).toBe(state)
  })
})
