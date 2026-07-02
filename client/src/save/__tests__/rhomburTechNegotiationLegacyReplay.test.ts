import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { TechTileId } from '../../data/techTiles'
import { applyGameAction } from '../../components/GameContext/GameContext'
import { buildInitialState } from '../buildInitialState'
import { replayEvents } from '../replay'
import { GamePhase, PlayerColor } from '../../types/GameTypes'
import type { EventEntry, SetupBlock } from '../types'

const TECH_NEGOTIATION_ID = BOARD_SPACES.find(s => s.name === 'Tech Negotiation')!.id

const rhomburSandboxSetup: SetupBlock = {
  firstPlayer: 0,
  players: [
    {
      id: 0,
      leaderId: 'prince-rhombur-vernius',
      color: PlayerColor.BLUE,
      deckCardIds: ['starting/signet-ring', 'starting/diplomacy'],
      startingResources: { spice: 10, water: 1, troops: 3 },
    },
    { id: 1, leaderId: 'ariana', color: PlayerColor.GREEN, deckCardIds: ['starting/diplomacy'] },
    { id: 2, leaderId: 'ilban', color: PlayerColor.YELLOW, deckCardIds: ['starting/diplomacy'] },
    { id: 3, leaderId: 'beast', color: PlayerColor.RED, deckCardIds: ['starting/diplomacy'] },
  ],
  initialConflictId: 903,
  expansions: { riseOfIx: true, riseOfIxEpic: false, immortality: false },
  sandbox: true,
}

describe('legacy Rhombur signet + Tech Negotiation replay', () => {
  it('replays PAY_COST card-10-EFFECT-1 (negotiator) then board-space-24-OR then ACQUIRE_TECH', () => {
    const genesis = buildInitialState(rhomburSandboxSetup)
    const signet = genesis.players[0].deck.find(c => c.name === 'Signet Ring')!
    expect(signet.id).toBe(10)

    let state = {
      ...genesis,
      phase: GamePhase.PLAYER_TURNS,
      activePlayerId: 0,
      sandboxSetup: false,
      ixBoard: {
        stacks: [[TechTileId.MEMOCORDERS], [TechTileId.RESTRICTED_ORDINANCE], [TechTileId.HOLOPROJECTORS]],
        nextFaceUpRevealed: {},
      },
    }

    const events: EventEntry[] = [
      { a: { type: 'PLAY_CARD', playerId: 0, cardId: 10, deckIndex: 8 } },
      { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: TECH_NEGOTIATION_ID } },
      { a: { type: 'PAY_COST', playerId: 0, effectId: 'card-10-EFFECT-1' } },
      {
        a: {
          type: 'RESOLVE_CHOICE',
          playerId: 0,
          choiceId: 'board-space-24-OR',
          optionIndex: 0,
          source: { type: 'board-space', id: TECH_NEGOTIATION_ID, name: 'Tech Negotiation' },
        },
      },
      {
        a: {
          type: 'ACQUIRE_TECH',
          playerId: 0,
          tileId: TechTileId.MEMOCORDERS,
          stackIndex: 0,
          negotiatorsReturned: 1,
          discount: 0,
          nextFaceUpTileId: TechTileId.SPACEPORT,
        },
      },
    ]

    const { state: replayed, divergences } = replayEvents(state, events)
    expect(divergences).toEqual([])
    expect(replayed.players[0].negotiatorsOnIx).toBe(0)
    expect(replayed.players[0].tech?.some(t => t.id === TechTileId.MEMOCORDERS)).toBe(true)
    expect(replayed.pendingAcquireTech).toBeFalsy()
  })

  it('replays PAY_COST card-10-EFFECT (acquire) without needing a negotiator on Ix first', () => {
    const genesis = buildInitialState(rhomburSandboxSetup)
    let state = {
      ...genesis,
      phase: GamePhase.PLAYER_TURNS,
      activePlayerId: 0,
      sandboxSetup: false,
      ixBoard: {
        stacks: [[TechTileId.MEMOCORDERS], [TechTileId.RESTRICTED_ORDINANCE], [TechTileId.HOLOPROJECTORS]],
        nextFaceUpRevealed: {},
      },
    }
    state.players[0].negotiatorsOnIx = 0

    const events: EventEntry[] = [
      { a: { type: 'PLAY_CARD', playerId: 0, cardId: 10, deckIndex: 8 } },
      { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: TECH_NEGOTIATION_ID } },
      { a: { type: 'PAY_COST', playerId: 0, effectId: 'card-10-EFFECT' } },
      {
        a: {
          type: 'RESOLVE_CHOICE',
          playerId: 0,
          choiceId: 'board-space-24-OR',
          optionIndex: 0,
          source: { type: 'board-space', id: TECH_NEGOTIATION_ID, name: 'Tech Negotiation' },
        },
      },
      {
        a: {
          type: 'ACQUIRE_TECH',
          playerId: 0,
          tileId: TechTileId.MEMOCORDERS,
          stackIndex: 0,
          negotiatorsReturned: 0,
          discount: 0,
          nextFaceUpTileId: TechTileId.SPACEPORT,
        },
      },
    ]

    const { state: replayed } = replayEvents(state, events)
    expect(replayed.players[0].tech?.some(t => t.id === TechTileId.MEMOCORDERS)).toBe(true)
  })
})
