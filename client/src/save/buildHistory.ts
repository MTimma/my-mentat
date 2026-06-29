/**
 * Rebuild turn history from the event log (replaces full-state snapshots in GameState.history).
 */
import {
  applyGameAction,
  completeCombatTransition,
  deepCopyGameState,
  snapshotCombatResolutionForHistory,
  snapshotEndgameForHistory,
  snapshotStateForHistory,
  type GameAction,
} from '../components/GameContext/GameContext'
import { GamePhase, type GameState } from '../types/GameTypes'
import { buildInitialState } from './buildInitialState'
import type { EventEntry, SetupBlock } from './types'

function setupSnapshot(state: GameState): GameState {
  return deepCopyGameState({
    ...state,
    historyEntryKind: 'setup',
    history: [],
    setupBaseline: undefined,
  })
}

function roundStartSnapshot(state: GameState): GameState {
  return deepCopyGameState({
    ...state,
    historyEntryKind: 'round-start',
    currTurn: null,
    selectedCard: null,
    selectedCardDeckIndex: null,
    canEndTurn: false,
    canAcquireIR: false,
    gains: [],
    pendingRewards: [],
    history: [],
    setupBaseline: undefined,
  })
}

/** Replay events and produce the history rows the UI/time-travel expect. */
export function buildHistoryFromEvents(setup: SetupBlock, events: EventEntry[]): GameState[] {
  let state = buildInitialState(setup)
  let history: GameState[] = [setupSnapshot(state)]
  let stateBeforeCombat: GameState | null = null
  let lastEndTurnSnapshotSource: GameState | null = null

  for (const entry of events) {
    const action: GameAction = entry.a
    const stateBeforeAction = action.type === 'END_TURN' ? state : null

    if (action.type === 'RESOLVE_COMBAT') {
      stateBeforeCombat = state
    }

    state = applyGameAction(state, action)

    switch (action.type) {
      case 'SELECT_CONFLICT': {
        const roundStart = roundStartSnapshot(state)
        const isOpeningRoundStart = history.length <= 1 && state.currentRound === 1
        history = isOpeningRoundStart
          ? [{ ...roundStart, historyEntryKind: 'setup' as const }]
          : [...history, roundStart]
        break
      }
      case 'END_TURN': {
        if (state.phase === GamePhase.END_GAME) break
        if (stateBeforeAction?.currTurn && stateBeforeAction !== lastEndTurnSnapshotSource) {
          history = [...history, snapshotStateForHistory(stateBeforeAction)]
          lastEndTurnSnapshotSource = stateBeforeAction
        }
        break
      }
      case 'RESOLVE_COMBAT': {
        if (!stateBeforeCombat) break
        const combatRound = stateBeforeCombat.currentRound
        const transitioned = completeCombatTransition(state, stateBeforeCombat, null)
        const combatSnapshot = snapshotCombatResolutionForHistory(state, transitioned, combatRound)
        history = [...stateBeforeCombat.history, combatSnapshot]
        stateBeforeCombat = null
        if (state.phase === GamePhase.END_GAME) {
          const endgameSnapshot = snapshotEndgameForHistory(
            state,
            state.gains ?? [],
            state.endgameRevealedIntrigue ?? {},
            state.endgameWinners ?? []
          )
          history = [...history, endgameSnapshot]
        }
        break
      }
      case 'RESOLVE_ENDGAME': {
        if (state.endgameWinners) {
          history = [
            ...history,
            snapshotEndgameForHistory(
              state,
              state.gains ?? [],
              state.endgameRevealedIntrigue ?? {},
              state.endgameWinners
            ),
          ]
        }
        break
      }
      case 'SANDBOX_COMMIT_SETUP': {
        history = [setupSnapshot(state)]
        break
      }
      default:
        break
    }
  }

  return history
}

/** Map a history row index to the inclusive event index that produced it. */
export function historyIndexToEventIndex(
  setup: SetupBlock,
  events: EventEntry[],
  historyIndex: number
): number {
  if (historyIndex < 0) return -1
  let state = buildInitialState(setup)
  let history: GameState[] = [setupSnapshot(state)]
  let stateBeforeCombat: GameState | null = null
  let lastEndTurnSnapshotSource: GameState | null = null

  for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
    const action = events[eventIndex].a
    const stateBeforeAction = action.type === 'END_TURN' ? state : null
    if (action.type === 'RESOLVE_COMBAT') stateBeforeCombat = state
    state = applyGameAction(state, action)

    const beforeLen = history.length
    let index0Replaced = false
    switch (action.type) {
      case 'SELECT_CONFLICT': {
        const roundStart = roundStartSnapshot(state)
        const isOpening = history.length <= 1 && state.currentRound === 1
        history = isOpening
          ? [{ ...roundStart, historyEntryKind: 'setup' as const }]
          : [...history, roundStart]
        index0Replaced = isOpening
        break
      }
      case 'SANDBOX_COMMIT_SETUP': {
        history = [setupSnapshot(state)]
        index0Replaced = true
        break
      }
      case 'END_TURN':
        if (
          state.phase !== GamePhase.END_GAME &&
          stateBeforeAction?.currTurn &&
          stateBeforeAction !== lastEndTurnSnapshotSource
        ) {
          history = [...history, snapshotStateForHistory(stateBeforeAction)]
          lastEndTurnSnapshotSource = stateBeforeAction
        }
        break
      case 'RESOLVE_COMBAT':
        if (stateBeforeCombat) {
          const transitioned = completeCombatTransition(state, stateBeforeCombat, null)
          const combatSnapshot = snapshotCombatResolutionForHistory(
            state,
            transitioned,
            stateBeforeCombat.currentRound
          )
          history = [...stateBeforeCombat.history, combatSnapshot]
          stateBeforeCombat = null
        }
        break
      default:
        break
    }
    if (historyIndex === 0 && index0Replaced) {
      return eventIndex
    }
    if (history.length > beforeLen && history.length - 1 === historyIndex) {
      return eventIndex
    }
  }
  if (historyIndex === 0) return -1
  return events.length - 1
}
