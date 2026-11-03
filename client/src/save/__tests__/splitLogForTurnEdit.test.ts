import { describe, expect, it } from 'vitest'
import { GamePhase, PlayerColor } from '../../types/GameTypes'
import { applyGameAction, type GameAction } from '../../components/GameContext/GameContext'
import { buildInitialState } from '../buildInitialState'
import { buildHistoryFromEvents, splitLogForTurnEdit } from '../buildHistory'
import type { EventEntry, SetupBlock } from '../types'

const OFFICIAL_STARTING_DECK_IDS = [
  'starting/convincing-argument',
  'starting/convincing-argument',
  'starting/dagger',
  'starting/dagger',
  'starting/diplomacy',
  'starting/dune-the-desert-planet',
  'starting/dune-the-desert-planet',
  'starting/reconnaissance',
  'starting/seek-allies',
  'starting/signet-ring',
]

function makeSetup(): SetupBlock {
  return {
    firstPlayer: 0,
    players: [
      { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
      { id: 1, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
    ],
    initialConflictId: 901,
  }
}

function recordEvents(
  initial: ReturnType<typeof buildInitialState>,
  actions: GameAction[]
): EventEntry[] {
  let state = initial
  const events: EventEntry[] = []
  for (const action of actions) {
    const prev = state
    state = applyGameAction(state, action)
    if (state !== prev) {
      events.push({ a: JSON.parse(JSON.stringify(action)) as GameAction })
    }
  }
  return events
}

function buildTwoRoundLog(): { setup: SetupBlock; events: EventEntry[] } {
  const setup = makeSetup()
  let live = buildInitialState(setup)
  live = { ...live, phase: GamePhase.PLAYER_TURNS, activePlayerId: 0 }
  const p0Card = live.players[0].deck[0].id
  const p1Card = live.players[1].deck[0].id
  const events = recordEvents(live, [
    { type: 'PLAY_CARD', playerId: 0, cardId: p0Card },
    { type: 'PLACE_AGENT', playerId: 0, spaceId: 1 },
    { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
    { type: 'END_TURN', playerId: 0 },
    { type: 'PLAY_CARD', playerId: 1, cardId: p1Card },
    { type: 'PLACE_AGENT', playerId: 1, spaceId: 2 },
    { type: 'CLAIM_ALL_REWARDS', playerId: 1 },
    { type: 'END_TURN', playerId: 1 },
    { type: 'PLAY_CARD', playerId: 0, cardId: p0Card },
    { type: 'PLACE_AGENT', playerId: 0, spaceId: 3 },
    { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
    { type: 'END_TURN', playerId: 0 },
  ])
  return { setup, events }
}

describe('splitLogForTurnEdit', () => {
  it('drops the edited row and splits the log around it', () => {
    const { setup, events } = buildTwoRoundLog()
    const history = buildHistoryFromEvents(setup, events)
    // history[0] = setup, history[1] = P0 turn 1, history[2] = P1 turn 1
    expect(history.length).toBe(3)

    // Editing P1's turn keeps P0's turn and leaves nothing pending.
    const split = splitLogForTurnEdit(setup, events, 2)
    expect(split).not.toBeNull()
    expect(split!.kept.map(e => e.a.type)).toEqual([
      'PLAY_CARD',
      'PLACE_AGENT',
      'CLAIM_ALL_REWARDS',
      'END_TURN',
    ])
    expect(split!.pending).toHaveLength(0)
    // The edited row's own events appear in neither list.
    expect(split!.kept.length + split!.pending.length).toBe(events.length - 4)
  })

  it('keeps nothing before the first player turn and everything after it', () => {
    const { setup, events } = buildTwoRoundLog()
    const split = splitLogForTurnEdit(setup, events, 1)
    expect(split).not.toBeNull()
    expect(split!.kept).toHaveLength(0)
    expect(split!.pending.map(e => e.a.type)).toEqual([
      'PLAY_CARD',
      'PLACE_AGENT',
      'CLAIM_ALL_REWARDS',
      'END_TURN',
    ])
  })

  it('returns null for the setup row', () => {
    const { setup, events } = buildTwoRoundLog()
    expect(splitLogForTurnEdit(setup, events, 0)).toBeNull()
  })
})
