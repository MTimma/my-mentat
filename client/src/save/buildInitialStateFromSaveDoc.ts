import type { GameState } from '../types/GameTypes'
import { buildHistoryFromEvents } from './buildHistory'
import { buildInitialState } from './buildInitialState'
import { replaySaveDoc } from './replay'
import type { EventEntry, SaveDoc } from './types'

/** Deep-copy GameState for setup baseline (matches GameContext snapshot helper). */
function deepCopyGameState(state: GameState): GameState {
  return JSON.parse(
    JSON.stringify(state, (_key, value) => (value instanceof Set ? [...value] : value))
  ) as GameState
}

/**
 * Build live game state from a SaveDoc: replay events into board state and rebuild history.
 */
export function buildInitialStateFromSaveDoc(doc: SaveDoc): GameState {
  const events = JSON.parse(JSON.stringify(doc.events)) as EventEntry[]
  const { state: replayed, divergences } = replaySaveDoc(doc)

  if (divergences.length > 0 && typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    console.warn(
      '[save] Replay checksum divergences on load:',
      divergences.map(d => `event ${d.eventIndex} p${d.playerId}`)
    )
  }

  const genesis = buildInitialState(doc.setup)
  const setupBaseline = deepCopyGameState({ ...genesis, history: [], setupBaseline: undefined })

  return {
    ...replayed,
    setupBaseline,
    history: buildHistoryFromEvents(doc.setup, events),
  }
}
