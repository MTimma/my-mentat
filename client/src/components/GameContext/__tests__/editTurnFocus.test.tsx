// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { GameProvider, useGame } from '../GameContext'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { useTimeTravel } from '../../TimeTravel'
import { loadSaveFixture } from '../../../save/__tests__/loadSaveFixture'
import type { GameAction } from '../GameContext'
import type { GameState } from '../../../types/GameTypes'

let latest: GameState | null = null
let dispatchRef: ((action: GameAction) => void) | null = null
let viewIndex: number | null = null
let goToTurnRef: ((i: number) => void) | null = null
let returnToCurrentRef: (() => void) | null = null

const Probe = () => {
  const { gameState, dispatch } = useGame()
  const { viewingTurnIndex, goToTurn, returnToCurrent } = useTimeTravel()
  latest = gameState
  dispatchRef = dispatch
  viewIndex = viewingTurnIndex
  goToTurnRef = goToTurn
  returnToCurrentRef = returnToCurrent
  return null
}

function setup() {
  const doc = loadSaveFixture('agent-reveal-two-turns')
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

describe('edit turn focus', () => {
  it('sets redoFocusIndex to the edited turn after a clean replay', () => {
    setup()
    expect(latest!.history.length).toBe(3)

    // View the turn to edit, then confirm the edit (App dispatches + returns to live).
    act(() => goToTurnRef!(1))
    expect(viewIndex).toBe(1)
    send({ type: 'REDO_FROM_TURN', turnIndex: 1 })
    act(() => returnToCurrentRef!())
    expect(latest!.redoEditing).toBe(true)
    expect(latest!.redoPreviewHistory?.length).toBe(1)
    expect(viewIndex).toBeNull()

    send({ type: 'PLAY_CARD', playerId: 0, cardId: 3 })
    send({ type: 'PLACE_AGENT', playerId: 0, spaceId: 12 })
    send({ type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    send({ type: 'END_TURN', playerId: 0 })

    expect(latest!.redoEditing).toBe(false)
    expect(latest!.redoConflict).toBeNull()
    expect(latest!.history.length).toBe(3)
    expect(latest!.redoFocusIndex).toBe(1)
    expect(viewIndex).toBe(1)
  })

  it('focuses the edited turn even when it is the last one', () => {
    setup()
    act(() => goToTurnRef!(2))
    send({ type: 'REDO_FROM_TURN', turnIndex: 2 })
    act(() => returnToCurrentRef!())
    expect(latest!.redoEditing).toBe(true)

    send({ type: 'PLAY_CARD', playerId: 1, cardId: 5 })
    send({ type: 'PLACE_AGENT', playerId: 1, spaceId: 15 })
    send({ type: 'CLAIM_ALL_REWARDS', playerId: 1 })
    send({ type: 'END_TURN', playerId: 1 })

    expect(latest!.redoEditing).toBe(false)
    expect(latest!.redoFocusIndex).toBe(2)
    expect(viewIndex).toBe(2)
  })
})
