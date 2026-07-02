import { describe, expect, it } from 'vitest'
import { TechTileId } from '../../data/techTiles'
import { applyGameAction } from '../../components/GameContext/GameContext'
import { buildInitialState } from '../buildInitialState'
import { buildHistoryFromEvents } from '../buildHistory'
import { GamePhase, PlayerColor, RewardType } from '../../types/GameTypes'
import { getGainsForHistoryRow, groupGainsBySource } from '../../utils/turnGainsDisplay'
import type { EventEntry, SetupBlock } from '../types'

function recordEvents(
  setup: SetupBlock,
  actions: Parameters<typeof applyGameAction>[1][]
): EventEntry[] {
  let state = { ...buildInitialState(setup), phase: GamePhase.PLAYER_TURNS }
  const events: EventEntry[] = []
  for (const action of actions) {
    const prev = state
    state = applyGameAction(state, action)
    if (state !== prev) {
      events.push({ a: JSON.parse(JSON.stringify(action)) })
    }
  }
  return events
}

const rhomburSetup: SetupBlock = {
  firstPlayer: 0,
  players: [
    {
      id: 0,
      leaderId: 'prince-rhombur-vernius',
      color: PlayerColor.BLUE,
      deckCardIds: ['starting/signet-ring', 'starting/diplomacy'],
      startingResources: { spice: 10, troops: 3 },
    },
    { id: 1, leaderId: 'ariana', color: PlayerColor.GREEN, deckCardIds: ['starting/diplomacy'] },
    { id: 2, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: ['starting/diplomacy'] },
    { id: 3, leaderId: 'beast', color: PlayerColor.YELLOW, deckCardIds: ['starting/diplomacy'] },
  ],
  initialConflictId: 901,
  expansions: { riseOfIx: true, riseOfIxEpic: false, immortality: false },
  sandbox: false,
}

describe('buildHistoryFromEvents — Rhombur signet ring (RESOLVE_CHOICE OR)', () => {
  it('keeps negotiator gains after RESOLVE_CHOICE + END_TURN', () => {
    const genesis = buildInitialState(rhomburSetup)
    const signet = genesis.players[0].deck.find(c => c.name === 'Signet Ring')!

    let live = {
      ...genesis,
      phase: GamePhase.PLAYER_TURNS,
      ixBoard: {
        stacks: [[TechTileId.MEMOCORDERS], [TechTileId.RESTRICTED_ORDINANCE], [TechTileId.HOLOPROJECTORS]],
        nextFaceUpRevealed: {},
      },
    }
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId: signet.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })

    const choice = live.currTurn!.pendingChoices!.find(c => c.prompt === 'Signet Ring')!
    const negotiatorIndex = choice.options.findIndex(o => o.reward.techNegotiator === 1)
    live = applyGameAction(live, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice.id,
      optionIndex: negotiatorIndex,
      source: { type: 'card', id: signet.id, name: 'Signet Ring' },
    })
    const liveGroups = groupGainsBySource(getGainsForHistoryRow(live)).map(g => g.title)
    expect(liveGroups).toContain('Signet Ring')

    live = applyGameAction(live, { type: 'END_TURN', playerId: 0 })

    const events = recordEvents(rhomburSetup, [
      { type: 'PLAY_CARD', playerId: 0, cardId: signet.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 },
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      {
        type: 'RESOLVE_CHOICE',
        playerId: 0,
        choiceId: choice.id,
        optionIndex: negotiatorIndex,
        source: { type: 'card', id: signet.id, name: 'Signet Ring' },
      },
      { type: 'END_TURN', playerId: 0 },
    ])
    const history = buildHistoryFromEvents(rhomburSetup, events)
    const row = history[history.length - 1]
    expect(
      getGainsForHistoryRow(row).some(
        g => g.type === RewardType.NEGOTIATOR && g.name === 'Signet Ring'
      )
    ).toBe(true)
    expect(groupGainsBySource(getGainsForHistoryRow(row)).map(g => g.title)).toContain(
      'Signet Ring'
    )
  })

  it('replays legacy PAY_COST card-10-EFFECT as signet acquire-tech branch', () => {
    const genesis = buildInitialState(rhomburSetup)
    const signet = genesis.players[0].deck.find(c => c.name === 'Signet Ring')!

    let live = {
      ...genesis,
      phase: GamePhase.PLAYER_TURNS,
      ixBoard: {
        stacks: [[TechTileId.MEMOCORDERS], [TechTileId.SPACEPORT], [TechTileId.HOLOPROJECTORS]],
        nextFaceUpRevealed: {},
      },
    }
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId: signet.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })

    // Old saves paid separate optional effects before the OR-choice refactor.
    live = applyGameAction(live, {
      type: 'PAY_COST',
      playerId: 0,
      effectId: `card-${signet.id}-EFFECT`,
    })
    expect(live.pendingAcquireTech).toEqual(
      expect.objectContaining({ playerId: 0, discount: 0 })
    )
    live = applyGameAction(live, { type: 'END_TURN', playerId: 0 })

    const events = recordEvents(rhomburSetup, [
      { type: 'PLAY_CARD', playerId: 0, cardId: signet.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 },
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      { type: 'PAY_COST', playerId: 0, effectId: `card-${signet.id}-EFFECT` },
      { type: 'END_TURN', playerId: 0 },
    ])
    const history = buildHistoryFromEvents(rhomburSetup, events)
    const row = history[history.length - 1]
    expect(row.pendingAcquireTech).toEqual(
      expect.objectContaining({ playerId: 0, discount: 0 })
    )
  })

  it('replays legacy PAY_COST card-10-EFFECT-1 as signet negotiator branch', () => {
    const genesis = buildInitialState(rhomburSetup)
    const signet = genesis.players[0].deck.find(c => c.name === 'Signet Ring')!

    let live = {
      ...genesis,
      phase: GamePhase.PLAYER_TURNS,
      ixBoard: {
        stacks: [[TechTileId.MEMOCORDERS], [TechTileId.SPACEPORT], [TechTileId.HOLOPROJECTORS]],
        nextFaceUpRevealed: {},
      },
    }
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId: signet.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 })
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })

    live = applyGameAction(live, {
      type: 'PAY_COST',
      playerId: 0,
      effectId: `card-${signet.id}-EFFECT-1`,
    })
    expect(live.players[0].negotiatorsOnIx).toBe(1)
    expect(live.pendingAcquireTech).toBeFalsy()

    const events = recordEvents(rhomburSetup, [
      { type: 'PLAY_CARD', playerId: 0, cardId: signet.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: 15 },
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      { type: 'PAY_COST', playerId: 0, effectId: `card-${signet.id}-EFFECT-1` },
      { type: 'END_TURN', playerId: 0 },
    ])
    const history = buildHistoryFromEvents(rhomburSetup, events)
    const row = history[history.length - 1]
    expect(row.players[0].negotiatorsOnIx).toBe(1)
    expect(
      getGainsForHistoryRow(row).some(
        g => g.type === RewardType.NEGOTIATOR && g.name === 'Signet Ring'
      )
    ).toBe(true)
  })
})
