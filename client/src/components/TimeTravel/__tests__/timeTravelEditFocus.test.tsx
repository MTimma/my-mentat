// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { TimeTravelProvider, useTimeTravel } from '../TimeTravelContext'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import type { GameState } from '../../../types/GameTypes'

type Api = ReturnType<typeof useTimeTravel>

let latest: Api | null = null

const Probe = () => {
  latest = useTimeTravel()
  return null
}

function makeState(overrides: Partial<GameState>): GameState {
  return { history: [], ...overrides } as unknown as GameState
}

function setup(initial: GameState) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const renderWith = (gs: GameState) =>
    act(() => {
      root.render(
        <TimeTravelProvider gameState={gs} onUndoToTurn={() => {}} canEdit>
          <Probe />
        </TimeTravelProvider>
      )
    })
  renderWith(initial)
  return { renderWith }
}

describe('TimeTravel redo focus', () => {
  it('lands on the edited turn when the edit finishes', () => {
    const rows = (n: number) => Array.from({ length: n }, () => makeState({}))
    const { renderWith } = setup(makeState({ history: rows(5) }))
    expect(latest!.viewingTurnIndex).toBeNull()

    // Edit turn 3: history rewinds to 3 rows, later turns held as preview.
    renderWith(
      makeState({
        history: rows(3),
        redoEditing: true,
        redoPreviewHistory: rows(2),
      })
    )
    expect(latest!.viewingTurnIndex).toBeNull()

    // Edit finishes cleanly: history is back to 5 rows, focus on the edited turn.
    renderWith(makeState({ history: rows(5), redoFocusIndex: 2 }))
    expect(latest!.viewingTurnIndex).toBe(2)
  })
})
