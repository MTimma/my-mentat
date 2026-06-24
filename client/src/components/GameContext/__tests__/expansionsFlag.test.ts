import { describe, expect, it } from 'vitest'
import { OFFICIAL_BASE_RISE_OF_IX_PACK } from '../../../gamePacks/constants'
import { PlayerColor } from '../../../types/GameTypes'
import { LEADERS } from '../../../data/leaders'
import { STARTING_DECK } from '../../../data/cards'
import { buildSetupBlockFromConfiguration } from '../../../save/buildSetupBlock'
import { buildInitialState } from '../../../save/buildInitialState'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { GamePhase, NO_EXPANSIONS } from '../../../types/GameTypes'
import { getBaseTestState, makePlayer } from './_helpers'

describe('expansions feature flag', () => {
  it('expansions defaults to NO_EXPANSIONS when initialState omits it', () => {
    const state = getFreshDefaultGameState()
    expect(state.expansions).toEqual(NO_EXPANSIONS)
  })

  it('expansions seeded from setup gamePackId with Rise of Ix', () => {
    const leader = LEADERS[0]
    const deck = STARTING_DECK.slice(0, 10)
    const { setup } = buildSetupBlockFromConfiguration({
      players: [
        {
          id: 0,
          leader,
          color: PlayerColor.RED,
          spice: 2,
          water: 1,
          solari: 1,
          troops: 3,
          combatValue: 0,
          agents: 2,
          handCount: 5,
          intrigueCount: 0,
          deck: [...deck],
          discardPile: [],
          trash: [],
          hasHighCouncilSeat: false,
          hasSwordmaster: false,
          playArea: [],
          persuasion: 0,
          victoryPoints: 1,
          revealed: false,
        },
      ],
      firstPlayer: 0,
      imperiumRowDeck: [],
      gamePackId: OFFICIAL_BASE_RISE_OF_IX_PACK,
    })
    const state = buildInitialState(setup)
    expect(state.expansions.riseOfIx).toBe(true)
  })

  it('expansions seeded from initialState is preserved through END_TURN', () => {
    let s = {
      ...getBaseTestState(),
      expansions: { riseOfIx: true, riseOfIxEpic: false },
    }
    s = applyGameAction(s, { type: 'END_TURN', playerId: 0 })
    expect(s.expansions.riseOfIx).toBe(true)
  })

  it('expansions is preserved through PLAY_CARD', () => {
    let s = {
      ...getBaseTestState({ deck: [getBaseTestState().players[0].deck[0]] }),
      expansions: { riseOfIx: true, riseOfIxEpic: false },
      phase: GamePhase.PLAYER_TURNS,
      canEndTurn: false,
    }
    const card = s.players[0].deck[0]
    s = applyGameAction(s, {
      type: 'PLAY_CARD',
      playerId: 0,
      cardId: card.id,
      deckIndex: 0,
      spaceId: 1,
    })
    expect(s.expansions.riseOfIx).toBe(true)
  })

  it('UNDO_TO_TURN preserves expansions', () => {
    let s = getBaseTestState(undefined, { players: 2 })
    s = {
      ...s,
      expansions: { riseOfIx: true, riseOfIxEpic: false },
    }
    const setupSnapshot = { ...s, history: [], historyEntryKind: 'setup' as const }
    s = {
      ...s,
      history: [setupSnapshot, { ...s, history: [], activePlayerId: 1 }],
    }
    s = applyGameAction(s, { type: 'UNDO_TO_TURN', turnIndex: 0 })
    expect(s.expansions.riseOfIx).toBe(true)
  })

  it('expansions does not change between consecutive history snapshots when no flag-changing action runs', () => {
    const baseline = getFreshDefaultGameState()
    const withPlayers = {
      ...baseline,
      players: [makePlayer(0)],
      expansions: { riseOfIx: true, riseOfIxEpic: false },
      history: [{ ...baseline, history: [], historyEntryKind: 'setup' as const }],
    }
    const after = applyGameAction(withPlayers, { type: 'END_TURN', playerId: 0 })
    expect(after.expansions).toEqual(withPlayers.expansions)
  })
})
