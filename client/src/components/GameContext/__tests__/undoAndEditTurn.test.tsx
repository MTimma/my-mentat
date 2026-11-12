// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { GameProvider, useGame } from '../GameContext'
import type { GameAction } from '../GameContext'
import type { GameState } from '../../../types/GameTypes'
import type { SaveDoc } from '../../../save/types'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// P0 Signet Ring on Arrakeen, P1 Diplomacy on Carthag, then P0's live turn
// (Dagger on Imperial Basin) played up to the troop deployment.
const DOC = {
  schemaVersion: 1,
  meta: { id: 'undo-replay', title: 'undo replay' },
  setup: {
    firstPlayer: 0,
    players: [
      {
        id: 0,
        leaderId: 'paul',
        color: 'red',
        deckCardIds: ['starting/signet-ring', 'starting/dagger', 'starting/diplomacy'],
      },
      { id: 1, leaderId: 'ilban', color: 'blue', deckCardIds: ['starting/dagger', 'starting/diplomacy'] },
    ],
    initialConflictId: 901,
  },
  events: [
    { a: { type: 'PLAY_CARD', playerId: 0, cardId: 10 } },
    { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: 1 } },
    { a: { type: 'CLAIM_ALL_REWARDS', playerId: 0 } },
    { a: { type: 'END_TURN', playerId: 0 } },
    { a: { type: 'PLAY_CARD', playerId: 1, cardId: 5 } },
    { a: { type: 'PLACE_AGENT', playerId: 1, spaceId: 2 } },
    { a: { type: 'CLAIM_ALL_REWARDS', playerId: 1 } },
    { a: { type: 'END_TURN', playerId: 1 } },
    { a: { type: 'PLAY_CARD', playerId: 0, cardId: 3 } },
    { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: 4 } },
    { a: { type: 'CLAIM_ALL_REWARDS', playerId: 0 } },
    { a: { type: 'DEPLOY_TROOP', playerId: 0 } },
  ],
  branches: [],
  cursor: { branch: 'trunk', event: 12 },
} as unknown as SaveDoc

let latest: GameState | null = null
let dispatchRef: ((action: GameAction) => void) | null = null
let recordedCountRef: (() => number) | null = null
const Probe = () => {
  const { gameState, dispatch, getRecordedEventCount } = useGame()
  latest = gameState
  dispatchRef = dispatch
  recordedCountRef = getRecordedEventCount
  return null
}

function setup(doc: SaveDoc = DOC) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(
      <GameProvider gameInput={doc} canEdit>
        <Probe />
      </GameProvider>
    )
  })
}

const send = (action: GameAction) => act(() => dispatchRef!(action))

describe('undo', () => {
  it('replaying the live turn after an undo does not raise a conflict', () => {
    setup()
    expect(latest!.history.length).toBe(3)
    expect(latest!.activePlayerId).toBe(0)

    // Undo the in-progress turn (row 3) back to the end of turn 2.
    send({ type: 'UNDO_TO_TURN', turnIndex: 2 })
    expect(latest!.activePlayerId).toBe(0)
    expect(latest!.occupiedSpaces[4]).toBeUndefined()

    // Re-play the same turn and continue.
    send({ type: 'PLAY_CARD', playerId: 0, cardId: 3 })
    send({ type: 'PLACE_AGENT', playerId: 0, spaceId: 4 })
    send({ type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    send({ type: 'DEPLOY_TROOP', playerId: 0 })
    send({ type: 'END_TURN', playerId: 0 })

    expect(latest!.redoConflict).toBeNull()
    expect(latest!.activePlayerId).toBe(1)
    expect(latest!.history.length).toBe(4)
    expect(recordedCountRef!()).toBe(13)
  })

  it('drops the turns after the target row instead of holding them for replay', () => {
    setup()

    // Undo to the end of turn 1 — turn 2 and the in-progress turn 3 are dropped.
    send({ type: 'UNDO_TO_TURN', turnIndex: 1 })
    expect(latest!.activePlayerId).toBe(1)
    expect(latest!.occupiedSpaces[2]).toBeUndefined()
    expect(recordedCountRef!()).toBe(4)

    // Re-play turn 2 and continue; nothing is replayed on top of it.
    send({ type: 'PLAY_CARD', playerId: 1, cardId: 5 })
    send({ type: 'PLACE_AGENT', playerId: 1, spaceId: 2 })
    send({ type: 'CLAIM_ALL_REWARDS', playerId: 1 })
    send({ type: 'END_TURN', playerId: 1 })

    expect(latest!.redoConflict).toBeNull()
    expect(latest!.activePlayerId).toBe(0)
    expect(latest!.history.length).toBe(3)
    // Turn 3's agent placement was not replayed.
    expect(latest!.occupiedSpaces[4]).toBeUndefined()
    expect(recordedCountRef!()).toBe(8)
  })
})

describe('edit past turn', () => {
  it('reports the turn that can no longer be replayed', () => {
    setup()

    // Edit turn 2 (P1) — the in-progress turn 3 is held for replay.
    send({ type: 'REDO_FROM_TURN', turnIndex: 2 })
    expect(latest!.redoEditing).toBe(true)

    // Re-play turn 2 with the agent on Imperial Basin, where turn 3 placed.
    send({ type: 'PLAY_CARD', playerId: 1, cardId: 5 })
    send({ type: 'PLACE_AGENT', playerId: 1, spaceId: 4 })
    send({ type: 'CLAIM_ALL_REWARDS', playerId: 1 })
    send({ type: 'END_TURN', playerId: 1 })

    expect(latest!.redoConflict).not.toBeNull()
    expect(latest!.redoConflict!.reason).toBe('occupied_space')
    expect(latest!.redoConflict!.message).toBe(
      'Turn 3 is no longer valid - the board space is no longer available.'
    )
  })
})
