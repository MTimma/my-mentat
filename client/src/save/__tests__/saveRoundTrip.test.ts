import { describe, expect, it } from 'vitest'
import { PlayerColor, GamePhase } from '../../types/GameTypes'
import type { GameAction } from '../../components/GameContext/GameContext'
import { applyGameAction } from '../../components/GameContext/GameContext'
import { buildInitialState } from '../buildInitialState'
import {
  GameRecorder,
  REPLAYABLE_ACTIONS,
  computeChecksum,
  eventsForLine,
  replayEvents,
  replaySaveDoc,
} from '../replay'
import type { SaveDoc, SetupBlock } from '../types'
import { OFFICIAL_BASE_PACK } from '../../gamePacks/constants'

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

function makeSetup(overrides: Partial<SetupBlock> = {}): SetupBlock {
  return {
    firstPlayer: 0,
    gamePackId: OFFICIAL_BASE_PACK,
    players: [
      { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
      { id: 1, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
    ],
    initialConflictId: 901,
    ...overrides,
  }
}

/** Normalize for deep comparison: strip non-replayed runtime fields. */
function normalize(state: ReturnType<typeof buildInitialState>) {
  const { history, setupBaseline, ...rest } = state
  return JSON.parse(
    JSON.stringify(rest, (_key, value) => (value instanceof Set ? [...value].sort() : value))
  )
}

describe('event-sourced save round trip', () => {
  it('buildInitialState resolves catalog ids deterministically', () => {
    const a = buildInitialState(makeSetup())
    const b = buildInitialState(makeSetup())
    expect(normalize(a)).toEqual(normalize(b))
    expect(a.players).toHaveLength(2)
    expect(a.players[0].deck.map(c => c.name)).toContain('The Voice')
    expect(a.players[0].leader.name).toBe('Paul Atreides')
    expect(a.currentConflict.id).toBe(901)
    // imperium deck instances re-id'd from 2000
    expect(a.imperiumRowDeck.every(c => c.id >= 2000)).toBe(true)
  })

  it('throws on unknown catalog ids', () => {
    expect(() =>
      buildInitialState(makeSetup({ players: [
        { id: 0, leaderId: 'nope', color: PlayerColor.RED, deckCardIds: STARTING_DECK_IDS },
      ] }))
    ).toThrow(/Unknown leader/)
    expect(() =>
      buildInitialState(makeSetup({ players: [
        { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: ['starting/not-a-card'] },
      ] }))
    ).toThrow(/Unknown card/)
  })

  it('records, saves, reloads and replays to an identical state', () => {
    const setup = makeSetup()
    const recorder = new GameRecorder(setup, { id: 'g1', title: 'round trip' })

    let live = buildInitialState(setup)
    live = { ...live, phase: GamePhase.PLAYER_TURNS }

    const script: GameAction[] = [
      { type: 'PLAY_CARD', playerId: 0, cardId: live.players[0].deck[5].id }, // Fremen Camp
      { type: 'PLACE_AGENT', playerId: 0, spaceId: 12 }, // Hall of Oratory
      // Consumes pendingRewards by their deterministic semantic ids.
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      { type: 'END_TURN', playerId: 0 },
    ]
    for (const action of script) {
      const before = live
      live = applyGameAction(live, action)
      recorder.record(action, before, live)
    }

    const doc = recorder.toSaveDoc()
    // The save document must survive JSON round-trips (file export/import).
    const reloaded: SaveDoc = JSON.parse(JSON.stringify(doc))
    expect(reloaded.events).toHaveLength(4)
    expect(reloaded.events[3].ck).toBeDefined()

    let replayed = buildInitialState(reloaded.setup)
    replayed = { ...replayed, phase: GamePhase.PLAYER_TURNS }
    const result = replayEvents(replayed, reloaded.events)

    expect(result.divergences).toEqual([])
    expect(normalize(result.state)).toEqual(normalize(live))
  })

  it('detects divergence via END_TURN checksums when the log is tampered', () => {
    const setup = makeSetup()
    const recorder = new GameRecorder(setup, { id: 'g2', title: 'divergence' })

    let live = buildInitialState(setup)
    live = { ...live, phase: GamePhase.PLAYER_TURNS }
    const actions: GameAction[] = [
      { type: 'PLAY_CARD', playerId: 0, cardId: live.players[0].deck[5].id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: 12 },
      { type: 'END_TURN', playerId: 0 },
    ]
    for (const action of actions) {
      const before = live
      live = applyGameAction(live, action)
      recorder.record(action, before, live)
    }
    const doc = recorder.toSaveDoc()
    // Tamper: claim the player ended the turn with different spice
    doc.events[2].ck!['p0'][0] += 3

    let replayed = buildInitialState(doc.setup)
    replayed = { ...replayed, phase: GamePhase.PLAYER_TURNS }
    const result = replayEvents(replayed, doc.events)
    expect(result.divergences).toHaveLength(1)
    expect(result.divergences[0]).toMatchObject({ eventIndex: 2, playerId: 0 })
  })

  it('undo actions are not replayable (branch operations, not log entries)', () => {
    expect(REPLAYABLE_ACTIONS.has('UNDO_TO_TURN')).toBe(false)
    expect(REPLAYABLE_ACTIONS.has('UNDO_TO_SETUP')).toBe(false)
    expect(REPLAYABLE_ACTIONS.has('DRAW_INTRIGUE' as never)).toBe(false)
  })

  it('branches fold parent prefix + branch events; trunk is untouched', () => {
    const setup = makeSetup()
    const recorder = new GameRecorder(setup, { id: 'g3', title: 'branching' })

    let live = buildInitialState(setup)
    live = { ...live, phase: GamePhase.PLAYER_TURNS }
    const trunkActions: GameAction[] = [
      { type: 'PLAY_CARD', playerId: 0, cardId: live.players[0].deck[5].id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: 12 },
      { type: 'END_TURN', playerId: 0 },
    ]
    for (const action of trunkActions) {
      const before = live
      live = applyGameAction(live, action)
      recorder.record(action, before, live)
    }
    const doc = recorder.toSaveDoc()
    const trunkJson = JSON.stringify(doc.events)

    // Fork after PLAY_CARD: place the agent somewhere else instead.
    doc.branches.push({
      id: 'b1',
      parent: 'trunk',
      forkAtEvent: 1,
      label: 'what-if: Wealth instead',
      createdAt: '2026-06-12T00:00:00Z',
      events: [
        { a: { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 } },
        { a: { type: 'END_TURN', playerId: 0 } },
      ],
    })
    doc.cursor = { branch: 'b1', event: 2 }

    const line = eventsForLine(doc, 'b1')
    expect(line).toHaveLength(3)
    expect(JSON.stringify(doc.events)).toBe(trunkJson) // trunk never rewritten

    const trunkResult = replaySaveDoc(doc, 'trunk')
    const branchResult = replaySaveDoc(doc, 'b1')
    // Same card played; different space → different occupiedSpaces
    expect(Object.keys(trunkResult.state.occupiedSpaces)).toContain('12')
    expect(Object.keys(branchResult.state.occupiedSpaces)).toContain('15')
    expect(Object.keys(branchResult.state.occupiedSpaces)).not.toContain('12')
  })

  it('rejects non-serializable action payloads at record time (dev guard)', () => {
    const recorder = new GameRecorder(makeSetup(), { id: 'g4', title: 'guard' })
    const bad = {
      type: 'RESOLVE_CARD_SELECT',
      playerId: 0,
      choiceId: 'x',
      cardIds: [1],
      onResolve: () => undefined,
    } as unknown as GameAction
    const live = buildInitialState(makeSetup())
    expect(() => recorder.record(bad, live)).toThrow(/Non-serializable/)
  })

  it('computeChecksum reads the right player fields', () => {
    const state = buildInitialState(makeSetup())
    const player = state.players[0]
    expect(computeChecksum(state, 0)).toEqual([
      player.spice,
      player.solari,
      player.water,
      player.troops,
      player.victoryPoints,
    ])
  })
})
