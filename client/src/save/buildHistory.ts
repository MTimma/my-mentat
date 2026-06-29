/**
 * Rebuild turn history from the event log (replaces full-state snapshots in GameState.history).
 */
import {
  applyGameAction,
  deepCopyGameState,
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

function combatResolutionStillDeferred(state: GameState): boolean {
  return (
    (state.pendingConflictRewardChoices?.length ?? 0) > 0 ||
    state.combatResolutionDeferred != null
  )
}

/** Combat snapshot from reducer (correct gains/strength); not from post-transition state. */
function extractCombatSnapshotFromReducer(
  stateBeforeAction: GameState,
  stateAfterAction: GameState
): GameState | null {
  if (combatResolutionStillDeferred(stateAfterAction)) return null
  const wasCombatRewards =
    stateBeforeAction.phase === GamePhase.COMBAT_REWARDS ||
    stateBeforeAction.combatResolutionDeferred != null
  if (!wasCombatRewards) return null

  for (let i = stateAfterAction.history.length - 1; i >= 0; i--) {
    const row = stateAfterAction.history[i]
    if (row.historyEntryKind === 'combat') return row
  }
  return null
}

function appendCombatSnapshotToHistory(
  history: GameState[],
  snapshot: GameState,
  stateAfterAction: GameState
): GameState[] {
  const withoutCombat = history.filter(h => h.historyEntryKind !== 'combat')
  let next = [...withoutCombat, snapshot]
  if (stateAfterAction.phase === GamePhase.END_GAME) {
    next = [
      ...next,
      snapshotEndgameForHistory(
        stateAfterAction,
        stateAfterAction.gains ?? [],
        stateAfterAction.endgameRevealedIntrigue ?? {},
        stateAfterAction.endgameWinners ?? []
      ),
    ]
  }
  return next
}

/** Replay events and produce the history rows the UI/time-travel expect. */
export function buildHistoryFromEvents(setup: SetupBlock, events: EventEntry[]): GameState[] {
  let state = buildInitialState(setup)
  let history: GameState[] = [setupSnapshot(state)]
  for (const entry of events) {
    const action: GameAction = entry.a
    const stateBeforeAction = action.type === 'END_TURN' ? state : null
    const preAction = state

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
        if (stateBeforeAction?.currTurn) {
          history = [...history, snapshotStateForHistory(stateBeforeAction)]
        }
        break
      }
      case 'RESOLVE_COMBAT':
      case 'RESOLVE_CONFLICT_REWARD_CHOICE': {
        const combatSnapshot = extractCombatSnapshotFromReducer(preAction, state)
        if (combatSnapshot) {
          history = appendCombatSnapshotToHistory(history, combatSnapshot, state)
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
  for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
    const action = events[eventIndex].a
    const stateBeforeAction = action.type === 'END_TURN' ? state : null
    const preAction = state
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
        if (state.phase !== GamePhase.END_GAME && stateBeforeAction?.currTurn) {
          history = [...history, snapshotStateForHistory(stateBeforeAction)]
        }
        break
      case 'RESOLVE_COMBAT':
      case 'RESOLVE_CONFLICT_REWARD_CHOICE': {
        const combatSnapshot = extractCombatSnapshotFromReducer(preAction, state)
        if (combatSnapshot) {
          history = appendCombatSnapshotToHistory(history, combatSnapshot, state)
        }
        break
      }
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
