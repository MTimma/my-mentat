import { describe, expect, it } from 'vitest'
import {
  AgentIcon,
  FactionType,
  GamePhase,
  PlayerColor,
  RewardType,
  TurnType,
  type Card,
} from '../../types/GameTypes'
import { applyGameAction, type GameAction } from '../../components/GameContext/GameContext'
import { getBaseTestState, withCardOnTop } from '../../components/GameContext/__tests__/_helpers'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { getGainsForHistoryRow } from '../../utils/turnGainsDisplay'
import { buildInitialState } from '../buildInitialState'
import {
  buildHistoryFromEvents,
  historyIndexToEventIndex,
  upsertCombatHistoryEntry,
} from '../buildHistory'
import type { EventEntry, SetupBlock } from '../types'

const SHIFTING_ALLEGIANCES: Card = {
  id: 1051,
  name: 'Shifting Allegiances',
  image: 'imperium_row/shifting_allegiances.avif',
  agentIcons: [AgentIcon.LANDSRAAD, AgentIcon.SPICE_TRADE],
  cost: 3,
  playEffect: [
    {
      cost: {
        spice: 2,
        influence: {
          chooseOne: true,
          amounts: [
            { faction: FactionType.EMPEROR, amount: 1 },
            { faction: FactionType.SPACING_GUILD, amount: 1 },
            { faction: FactionType.BENE_GESSERIT, amount: 1 },
            { faction: FactionType.FREMEN, amount: 1 },
          ],
        },
      },
      reward: {
        influence: {
          chooseOne: true,
          amounts: [
            { faction: FactionType.EMPEROR, amount: 2 },
            { faction: FactionType.SPACING_GUILD, amount: 2 },
            { faction: FactionType.BENE_GESSERIT, amount: 2 },
            { faction: FactionType.FREMEN, amount: 2 },
          ],
        },
      },
    },
  ],
}

function recordEvents(
  initial: ReturnType<typeof buildInitialState>,
  actions: GameAction[]
): { state: ReturnType<typeof buildInitialState>; events: EventEntry[] } {
  let state = initial
  const events: EventEntry[] = []
  for (const action of actions) {
    const prev = state
    state = applyGameAction(state, action)
    if (state !== prev) {
      events.push({ a: JSON.parse(JSON.stringify(action)) as GameAction })
    }
  }
  return { state, events }
}

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

function makeSetup(): SetupBlock {
  return {
    firstPlayer: 0,
    players: [
      { id: 0, leaderId: 'paul', color: PlayerColor.RED, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
      { id: 1, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: OFFICIAL_STARTING_DECK_IDS },
    ],
    initialConflictId: 901,
  }
}

describe('upsertCombatHistoryEntry', () => {
  const combatRow = (round: number): GameState =>
    ({
      currentRound: round,
      historyEntryKind: 'combat',
    }) as GameState

  it('dedupes combat rows for the same round but keeps earlier rounds', () => {
    const setup = { historyEntryKind: 'setup' } as GameState
    let history = upsertCombatHistoryEntry([setup], combatRow(1))
    history = upsertCombatHistoryEntry(history, combatRow(1))
    expect(history.filter(h => h.historyEntryKind === 'combat')).toHaveLength(1)
    expect(history.filter(h => h.historyEntryKind === 'combat')[0].currentRound).toBe(1)

    history = upsertCombatHistoryEntry(history, combatRow(2))
    const combats = history.filter(h => h.historyEntryKind === 'combat')
    expect(combats).toHaveLength(2)
    expect(combats.map(c => c.currentRound)).toEqual([1, 2])
  })
})

describe('buildHistoryFromEvents', () => {
  it('END_TURN snapshot keeps currTurn and turn gains (not post-cleared state)', () => {
    let live = buildInitialState(makeSetup())
    live = {
      ...live,
      phase: GamePhase.PLAYER_TURNS,
      activePlayerId: 0,
    }
    const cardId = live.players[0].deck[0].id
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: 1 })
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    expect(live.currTurn).not.toBeNull()

    const events = [
      { a: { type: 'PLAY_CARD' as const, playerId: 0, cardId } },
      { a: { type: 'PLACE_AGENT' as const, playerId: 0, spaceId: 1 } },
      { a: { type: 'CLAIM_ALL_REWARDS' as const, playerId: 0 } },
      { a: { type: 'END_TURN' as const, playerId: 0 } },
    ]

    const history = buildHistoryFromEvents(makeSetup(), events)
    expect(history).toHaveLength(2) // setup + one player turn
    const turnRow = history[1]
    expect(turnRow.currTurn?.type).toBe(TurnType.ACTION)
    expect(turnRow.currTurn?.playerId).toBe(0)
    expect(turnRow.gains.length).toBeGreaterThan(0)
    expect(turnRow.gains.some(g => g.type === RewardType.TROOPS)).toBe(true)
  })

  it('ignores rejected END_TURN events (no currTurn snapshot)', () => {
    const events = [
      { a: { type: 'END_TURN' as const, playerId: 0 } },
      { a: { type: 'END_TURN' as const, playerId: 1 } },
    ]
    const history = buildHistoryFromEvents(makeSetup(), events)
    const playerTurns = history.filter(h => h.historyEntryKind !== 'setup' && h.historyEntryKind !== 'round-start')
    expect(playerTurns).toHaveLength(0)
  })

  it('does not add a second empty row when END_TURN is rejected after a completed turn', () => {
    let live = buildInitialState(makeSetup())
    live = { ...live, phase: GamePhase.PLAYER_TURNS, activePlayerId: 0 }
    const cardId = live.players[0].deck[0].id
    const events = [
      { a: { type: 'PLAY_CARD' as const, playerId: 0, cardId } },
      { a: { type: 'PLACE_AGENT' as const, playerId: 0, spaceId: 1 } },
      { a: { type: 'CLAIM_ALL_REWARDS' as const, playerId: 0 } },
      { a: { type: 'END_TURN' as const, playerId: 0 } },
      { a: { type: 'END_TURN' as const, playerId: 0 } },
    ]
    const history = buildHistoryFromEvents(makeSetup(), events)
    const playerTurns = history.filter(h => h.historyEntryKind !== 'setup' && h.historyEntryKind !== 'round-start')
    expect(playerTurns).toHaveLength(1)
    expect(playerTurns[0].currTurn?.playerId).toBe(0)
  })

  it('keeps combat rows from multiple rounds after event replay', () => {
    const setup = makeSetup()
    let live = buildInitialState(setup)
    const events: EventEntry[] = []

    const record = (action: GameAction) => {
      const prev = live
      live = applyGameAction(live, action)
      if (live !== prev) events.push({ a: JSON.parse(JSON.stringify(action)) as GameAction })
    }

    const finishPlayerTurnsAndCombat = () => {
      for (const playerId of [0, 1]) {
        const hand = live.players[playerId].deck.slice(0, live.players[playerId].handCount)
        record({ type: 'REVEAL_CARDS', playerId, cardIds: hand.map(c => c.id) })
        record({ type: 'END_TURN', playerId })
      }
      record({ type: 'START_COMBAT_PHASE' })
      record({ type: 'RESOLVE_COMBAT' })
    }

    record({ type: 'SELECT_CONFLICT', conflictId: 901 })
    finishPlayerTurnsAndCombat()
    record({ type: 'SELECT_CONFLICT', conflictId: 902 })
    finishPlayerTurnsAndCombat()

    const history = buildHistoryFromEvents(setup, events)
    const combats = history.filter(h => h.historyEntryKind === 'combat')
    expect(combats).toHaveLength(2)
    expect(combats.map(c => c.currentRound)).toEqual([1, 2])
  })

  it('keeps 2nd-influence VP in reducer snapshot and event-rebuilt history', () => {
    const IMPERIAL_BASIN_ID = BOARD_SPACES.find(s => s.name === 'Imperial Basin')!.id
    let live = getBaseTestState({ spice: 5 }, { players: 2, activeId: 0 })
    live = {
      ...live,
      factionInfluence: {
        ...live.factionInfluence,
        [FactionType.EMPEROR]: { 0: 2, 1: 0 },
      },
    }
    live = withCardOnTop(live, 0, SHIFTING_ALLEGIANCES)
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId: SHIFTING_ALLEGIANCES.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: IMPERIAL_BASIN_ID })
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    const effectId = live.currTurn!.optionalEffects![0].id
    live = applyGameAction(live, { type: 'PAY_COST', playerId: 0, effectId })
    const loseChoice = live.currTurn!.pendingChoices![0]
    live = applyGameAction(live, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: loseChoice.id,
      optionIndex: 0,
      source: loseChoice.source,
    })
    const gainChoice = live.currTurn!.pendingChoices![0]
    live = applyGameAction(live, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: gainChoice.id,
      optionIndex: 0,
      source: gainChoice.source,
    })
    const gainsBeforeEnd = getGainsForHistoryRow(live)
    expect(gainsBeforeEnd.some(g => g.type === RewardType.VICTORY_POINTS && g.amount === 1)).toBe(true)

    live = applyGameAction(live, { type: 'END_TURN', playerId: 0 })
    const reducerRow = live.history[live.history.length - 1]
    expect(
      getGainsForHistoryRow(reducerRow).some(g => g.type === RewardType.VICTORY_POINTS && g.amount === 1)
    ).toBe(true)

    const setup: SetupBlock = {
      firstPlayer: 0,
      players: [
        {
          id: 0,
          leaderId: 'paul',
          color: PlayerColor.RED,
          deckCardIds: ['starting/diplomacy', 'starting/shifting-allegiances'],
          startingResources: { spice: 5 },
        },
        {
          id: 1,
          leaderId: 'ilban',
          color: PlayerColor.BLUE,
          deckCardIds: ['starting/diplomacy'],
        },
      ],
      initialConflictId: 901,
    }
    const WEALTH_ID = BOARD_SPACES.find(s => s.name === 'Wealth')!.id
    const FOLDSPACE_ID = BOARD_SPACES.find(s => s.name === 'Foldspace')!.id
    const genesis = buildInitialState(setup)
    const diplomacy = genesis.players[0].deck.find(c => c.name === 'Diplomacy')!
    const shifting = genesis.players[0].deck.find(c => c.name === 'Shifting Allegiances')!
    const p1Card = genesis.players[1].deck[0]
    const prepActions: GameAction[] = [
      { type: 'PLAY_CARD', playerId: 0, cardId: diplomacy.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: WEALTH_ID },
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      { type: 'END_TURN', playerId: 0 },
      { type: 'PLAY_CARD', playerId: 1, cardId: p1Card.id },
      { type: 'PLACE_AGENT', playerId: 1, spaceId: FOLDSPACE_ID },
      { type: 'CLAIM_ALL_REWARDS', playerId: 1 },
      { type: 'END_TURN', playerId: 1 },
    ]
    const actions: GameAction[] = [
      ...prepActions,
      { type: 'PLAY_CARD', playerId: 0, cardId: shifting.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: IMPERIAL_BASIN_ID },
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      { type: 'PAY_COST', playerId: 0, effectId },
      {
        type: 'RESOLVE_CHOICE',
        playerId: 0,
        choiceId: loseChoice.id,
        optionIndex: 0,
        source: loseChoice.source,
      },
      {
        type: 'RESOLVE_CHOICE',
        playerId: 0,
        choiceId: gainChoice.id,
        optionIndex: 0,
        source: gainChoice.source,
      },
      { type: 'END_TURN', playerId: 0 },
    ]
    const { events } = recordEvents(
      { ...buildInitialState(setup), phase: GamePhase.PLAYER_TURNS },
      actions
    )
    const history = buildHistoryFromEvents(setup, events)
    const replayRow = history[history.length - 1]
    expect(
      getGainsForHistoryRow(replayRow).some(g => g.type === RewardType.VICTORY_POINTS && g.amount === 1)
    ).toBe(true)
  })

})

describe('historyIndexToEventIndex', () => {
  it('maps opening round-start at index 0 to SELECT_CONFLICT (not pre-setup)', () => {
    let live = buildInitialState(makeSetup())
    const rowIds = live.imperiumRowDeck.slice(0, 5).map(c => c.id)
    live = applyGameAction(live, { type: 'RESET_IMPERIUM_ROW', cardIds: rowIds })
    const conflictId = 901
    const events = [
      { a: { type: 'RESET_IMPERIUM_ROW' as const, cardIds: rowIds } },
      { a: { type: 'SELECT_CONFLICT' as const, conflictId } },
      { a: { type: 'PLAY_CARD' as const, playerId: 0, cardId: live.players[0].deck[0].id } },
    ]
    const history = buildHistoryFromEvents(makeSetup(), events)
    expect(history).toHaveLength(1)
    expect(history[0].phase).toBe(GamePhase.PLAYER_TURNS)

    const eventIndex = historyIndexToEventIndex(makeSetup(), events, 0)
    expect(eventIndex).toBe(1)
  })

  it('returns -1 for true pre-setup index 0 before SELECT_CONFLICT', () => {
    const rowIds = buildInitialState(makeSetup()).imperiumRowDeck.slice(0, 5).map(c => c.id)
    const events = [{ a: { type: 'RESET_IMPERIUM_ROW' as const, cardIds: rowIds } }]
    expect(historyIndexToEventIndex(makeSetup(), events, 0)).toBe(-1)
  })

  it('maps player turn rows at index 1+', () => {
    let live = buildInitialState(makeSetup())
    live = { ...live, phase: GamePhase.PLAYER_TURNS, activePlayerId: 0 }
    const cardId = live.players[0].deck[0].id
    const events = [
      { a: { type: 'PLAY_CARD' as const, playerId: 0, cardId } },
      { a: { type: 'PLACE_AGENT' as const, playerId: 0, spaceId: 1 } },
      { a: { type: 'CLAIM_ALL_REWARDS' as const, playerId: 0 } },
      { a: { type: 'END_TURN' as const, playerId: 0 } },
    ]
    const history = buildHistoryFromEvents(makeSetup(), events)
    expect(historyIndexToEventIndex(makeSetup(), events, 1)).toBe(3)
  })
})
