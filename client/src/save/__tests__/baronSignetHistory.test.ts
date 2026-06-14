import { describe, expect, it } from 'vitest'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { applyGameAction } from '../../components/GameContext/GameContext'
import { buildInitialState } from '../buildInitialState'
import { buildHistoryFromEvents } from '../buildHistory'
import { GamePhase, PlayerColor, RewardType, TurnType } from '../../types/GameTypes'
import { getGainsForHistoryRow, groupGainsBySource } from '../../utils/turnGainsDisplay'
import type { EventEntry, SetupBlock } from '../types'

const IMPERIAL_BASIN_ID = BOARD_SPACES.find(s => s.name === 'Imperial Basin')!.id
const FOLDSPACE_ID = BOARD_SPACES.find(s => s.name === 'Foldspace')!.id

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

const fourPlayerSetup: SetupBlock = {
  firstPlayer: 0,
  players: [
    {
      id: 0,
      leaderId: 'baron',
      color: PlayerColor.RED,
      deckCardIds: ['starting/signet-ring', 'starting/diplomacy'],
      startingResources: { solari: 3 },
    },
    { id: 1, leaderId: 'ariana', color: PlayerColor.GREEN, deckCardIds: ['starting/diplomacy'] },
    { id: 2, leaderId: 'ilban', color: PlayerColor.BLUE, deckCardIds: ['starting/diplomacy'] },
    { id: 3, leaderId: 'beast', color: PlayerColor.YELLOW, deckCardIds: ['starting/diplomacy'] },
  ],
  initialConflictId: 901,
}

describe('buildHistoryFromEvents — Baron signet ring turn', () => {
  it('keeps Imperial Basin spice and Baron signet PAY_COST gains after END_TURN', () => {
    const genesis = buildInitialState(fourPlayerSetup)
    const signet = genesis.players[0].deck.find(c => c.name === 'Signet Ring')!
    const diplomacy = genesis.players[1].deck.find(c => c.name === 'Diplomacy')!

    let live = { ...genesis, phase: GamePhase.PLAYER_TURNS }
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId: signet.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: IMPERIAL_BASIN_ID })
    const effectId = live.currTurn!.optionalEffects![0].id
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    live = applyGameAction(live, { type: 'PAY_COST', playerId: 0, effectId })
    const liveGroups = groupGainsBySource(getGainsForHistoryRow(live)).map(g => g.title)
    expect(liveGroups).toContain('Imperial Basin')
    expect(liveGroups).toContain('Signet Ring')

    live = applyGameAction(live, { type: 'END_TURN', playerId: 0 })

    const events = recordEvents(fourPlayerSetup, [
      { type: 'PLAY_CARD', playerId: 0, cardId: signet.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: IMPERIAL_BASIN_ID },
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      { type: 'PAY_COST', playerId: 0, effectId },
      { type: 'END_TURN', playerId: 0 },
    ])
    const history = buildHistoryFromEvents(fourPlayerSetup, events)
    const row = history[history.length - 1]
    const histGroups = groupGainsBySource(getGainsForHistoryRow(row)).map(g => g.title)
    expect(histGroups).toEqual(liveGroups)
    expect(
      getGainsForHistoryRow(row).some(g => g.type === RewardType.INTRIGUE && g.amount === 1)
    ).toBe(true)
  })

  it('keeps per-reward CLAIM_REWARD auto-apply gains (Wealth influence) in history', () => {
    const genesis = buildInitialState(fourPlayerSetup)
    const diplomacy = genesis.players[0].deck.find(c => c.name === 'Diplomacy')!
    const WEALTH_ID = BOARD_SPACES.find(s => s.name === 'Wealth')!.id

    let live = { ...genesis, phase: GamePhase.PLAYER_TURNS }
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId: diplomacy.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: WEALTH_ID })
    const rewardIds = live.pendingRewards.filter(r => !r.disabled).map(r => r.id)
    for (const rewardId of rewardIds) {
      live = applyGameAction(live, { type: 'CLAIM_REWARD', playerId: 0, rewardId })
    }
    expect(
      getGainsForHistoryRow(live).some(g => g.type === RewardType.INFLUENCE)
    ).toBe(true)

    live = applyGameAction(live, { type: 'END_TURN', playerId: 0 })

    const events = recordEvents(fourPlayerSetup, [
      { type: 'PLAY_CARD', playerId: 0, cardId: diplomacy.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: WEALTH_ID },
      ...rewardIds.map(rewardId => ({
        type: 'CLAIM_REWARD' as const,
        playerId: 0,
        rewardId,
      })),
      { type: 'END_TURN', playerId: 0 },
    ])
    const history = buildHistoryFromEvents(fourPlayerSetup, events)
    const row = history[history.length - 1]
    expect(
      getGainsForHistoryRow(row).some(g => g.type === RewardType.INFLUENCE)
    ).toBe(true)
  })

  it('sandwiches other players between baron turns without losing baron gains', () => {
    const genesis = buildInitialState(fourPlayerSetup)
    const baronSignet = genesis.players[0].deck.find(c => c.name === 'Signet Ring')!
    const diplomacy = genesis.players[0].deck.find(c => c.name === 'Diplomacy')!

    let live = { ...genesis, phase: GamePhase.PLAYER_TURNS }
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 0, cardId: baronSignet.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 0, spaceId: IMPERIAL_BASIN_ID })
    const effectId = live.currTurn!.optionalEffects![0].id
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 0 })
    live = applyGameAction(live, { type: 'PAY_COST', playerId: 0, effectId })
    live = applyGameAction(live, { type: 'END_TURN', playerId: 0 })

    const p1Card = live.players[1].deck[0]
    live = applyGameAction(live, { type: 'PLAY_CARD', playerId: 1, cardId: p1Card.id })
    live = applyGameAction(live, { type: 'PLACE_AGENT', playerId: 1, spaceId: FOLDSPACE_ID })
    live = applyGameAction(live, { type: 'CLAIM_ALL_REWARDS', playerId: 1 })
    live = applyGameAction(live, { type: 'END_TURN', playerId: 1 })

    const events = recordEvents(fourPlayerSetup, [
      { type: 'PLAY_CARD', playerId: 0, cardId: baronSignet.id },
      { type: 'PLACE_AGENT', playerId: 0, spaceId: IMPERIAL_BASIN_ID },
      { type: 'CLAIM_ALL_REWARDS', playerId: 0 },
      { type: 'PAY_COST', playerId: 0, effectId },
      { type: 'END_TURN', playerId: 0 },
      { type: 'PLAY_CARD', playerId: 1, cardId: p1Card.id },
      { type: 'PLACE_AGENT', playerId: 1, spaceId: FOLDSPACE_ID },
      { type: 'CLAIM_ALL_REWARDS', playerId: 1 },
      { type: 'END_TURN', playerId: 1 },
    ])
    const history = buildHistoryFromEvents(fourPlayerSetup, events)
    const baronRow = history.find(
      h => h.currTurn?.playerId === 0 && h.currTurn?.type === TurnType.ACTION
    )
    expect(baronRow).toBeDefined()
    expect(groupGainsBySource(getGainsForHistoryRow(baronRow!)).map(g => g.title)).toContain(
      'Signet Ring'
    )
  })
})
