// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { GameProvider, useGame } from '../GameContext'
import type { GameAction } from '../GameContext'
import type { GameState } from '../../../types/GameTypes'
import type { SaveDoc } from '../../../save/types'
import { dreadnoughtDeployRoom, seedDeployEdit, troopDeployRoom } from '../../../utils/deployEdit'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// P0 agent turn on Arrakeen deploying one troop, then P1's turn.
const DOC = {
  schemaVersion: 1,
  meta: { id: 'deploy-edit', title: 'deploy edit' },
  setup: {
    firstPlayer: 0,
    players: [
      { id: 0, leaderId: 'paul', color: 'red', deckCardIds: ['starting/signet-ring', 'starting/dagger', 'starting/diplomacy'] },
      { id: 1, leaderId: 'ilban', color: 'blue', deckCardIds: ['starting/dagger', 'starting/diplomacy'] },
    ],
    initialConflictId: 901,
  },
  events: [
    { a: { type: 'PLAY_CARD', playerId: 0, cardId: 10 } },
    { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: 1 } },
    { a: { type: 'CLAIM_ALL_REWARDS', playerId: 0 } },
    { a: { type: 'DEPLOY_TROOP', playerId: 0 } },
    { a: { type: 'END_TURN', playerId: 0 } },
    { a: { type: 'PLAY_CARD', playerId: 1, cardId: 5 } },
    { a: { type: 'PLACE_AGENT', playerId: 1, spaceId: 2 } },
    { a: { type: 'CLAIM_ALL_REWARDS', playerId: 1 } },
    { a: { type: 'END_TURN', playerId: 1 } },
  ],
  branches: [],
  cursor: { branch: 'trunk', event: 9 },
} as unknown as SaveDoc

// P0 commissions a dreadnought, then deploys one troop on Arrakeen next turn.
const ROI_DOC = {
  schemaVersion: 1,
  meta: { id: 'deploy-edit-roi', title: 'deploy edit roi' },
  setup: {
    firstPlayer: 0,
    gamePackId: 'official/base+riseOfIx@1',
    expansions: { riseOfIx: true, riseOfIxEpic: false, immortality: false },
    players: [
      {
        id: 0,
        leaderId: 'paul',
        color: 'red',
        deckCardIds: ['starting/signet-ring', 'starting/dagger', 'starting/diplomacy'],
        startingResources: { solari: 10 },
      },
      { id: 1, leaderId: 'ilban', color: 'blue', deckCardIds: ['starting/dagger', 'starting/diplomacy'] },
    ],
    initialConflictId: 901,
  },
  events: [
    { a: { type: 'PLAY_CARD', playerId: 0, cardId: 10 } },
    { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: 23 } },
    { a: { type: 'END_TURN', playerId: 0 } },
    { a: { type: 'PLAY_CARD', playerId: 1, cardId: 5 } },
    { a: { type: 'PLACE_AGENT', playerId: 1, spaceId: 2 } },
    { a: { type: 'CLAIM_ALL_REWARDS', playerId: 1 } },
    { a: { type: 'END_TURN', playerId: 1 } },
    { a: { type: 'SELECT_CONFLICT', conflictId: 902 } },
    { a: { type: 'PLAY_CARD', playerId: 0, cardId: 3 } },
    { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: 1 } },
    { a: { type: 'CLAIM_ALL_REWARDS', playerId: 0 } },
    { a: { type: 'DEPLOY_TROOP', playerId: 0 } },
    { a: { type: 'END_TURN', playerId: 0 } },
  ],
  branches: [],
  cursor: { branch: 'trunk', event: 13 },
} as unknown as SaveDoc

let latest: GameState | null = null
let dispatchRef: ((action: GameAction) => void) | null = null
const Probe = () => {
  const { gameState, dispatch } = useGame()
  latest = gameState
  dispatchRef = dispatch
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

describe('REDO_TURN_DEPLOYMENT', () => {
  it('adds and removes deployed troops for a past turn', () => {
    setup()
    expect(latest!.combatTroops[0]).toBe(1)

    send({ type: 'REDO_TURN_DEPLOYMENT', turnIndex: 1, playerId: 0, troops: 2, dreadnoughts: 0 })
    expect(latest!.combatTroops[0]).toBe(2)
    expect(latest!.history[1].currTurn?.removableTroops).toBe(2)
    expect(latest!.redoFocusIndex).toBe(1)
    expect(latest!.redoEditing).toBe(false)

    send({ type: 'REDO_TURN_DEPLOYMENT', turnIndex: 1, playerId: 0, troops: 1, dreadnoughts: 0 })
    expect(latest!.combatTroops[0]).toBe(1)
    expect(latest!.history[1].currTurn?.removableTroops).toBe(1)
  })

  it('adds a garrisoned dreadnought and another troop to a past turn', () => {
    setup(ROI_DOC)

    expect(latest!.combatTroops[0]).toBe(1)
    expect(latest!.players[0].dreadnoughts?.garrison).toBe(1)

    const turnIndex = latest!.history.findIndex(
      row => row.currTurn?.playerId === 0 && row.currTurn.agentSpaceId === 1
    )
    expect(turnIndex).toBeGreaterThan(0)
    const edit = seedDeployEdit(latest!.history[turnIndex], turnIndex)!
    expect(troopDeployRoom(edit).deployable).toBeGreaterThan(0)
    expect(dreadnoughtDeployRoom(edit).deployable).toBe(1)

    send({ type: 'REDO_TURN_DEPLOYMENT', turnIndex, playerId: 0, troops: 2, dreadnoughts: 1 })

    expect(latest!.combatTroops[0]).toBe(2)
    expect(latest!.players[0].dreadnoughts?.conflict).toBe(1)
    expect(latest!.players[0].dreadnoughts?.garrison).toBe(0)
    expect(latest!.history[turnIndex].currTurn?.removableTroops).toBe(2)
    expect(latest!.history[turnIndex].currTurn?.removableDreadnoughts).toBe(1)
    expect(latest!.redoFocusIndex).toBe(turnIndex)
    expect(latest!.redoEditing).toBe(false)

    send({ type: 'REDO_TURN_DEPLOYMENT', turnIndex, playerId: 0, troops: 1, dreadnoughts: 0 })
    expect(latest!.combatTroops[0]).toBe(1)
    expect(latest!.players[0].dreadnoughts?.conflict).toBe(0)
    expect(latest!.players[0].dreadnoughts?.garrison).toBe(1)
  })
})
