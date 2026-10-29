import { describe, expect, it } from 'vitest'
import { GainSource, GamePhase, RewardType, TurnType, type GameState } from '../../types/GameTypes'
import { birdseyeTroopDeployCounts, buildBirdseyeGainsByPlayer } from '../birdseyeTurnChrome'

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    players: [],
    gains: [],
    currTurn: { playerId: 1, gainsStartIndex: 0 } as GameState['currTurn'],
    activePlayerId: 1,
    ...overrides,
  } as GameState
}

describe('buildBirdseyeGainsByPlayer', () => {
  it('splits active and incidental other-player gains', () => {
    const state = baseState({
      gains: [
        {
          playerId: 1,
          source: GainSource.BOARD_SPACE,
          sourceId: 1,
          round: 1,
          name: 'Arrakeen',
          amount: 1,
          type: RewardType.TROOPS,
        },
        {
          playerId: 2,
          source: GainSource.CONTROL,
          sourceId: 1,
          round: 1,
          name: 'Control',
          amount: 1,
          type: RewardType.SOLARI,
        },
        {
          playerId: 3,
          source: GainSource.SHIPPING_TRACK,
          sourceId: 1,
          round: 1,
          name: 'Dividends',
          amount: 2,
          type: RewardType.SOLARI,
        },
      ],
    })

    const byPlayer = buildBirdseyeGainsByPlayer(state)
    expect(byPlayer[1]?.map(g => g.name)).toEqual(['Arrakeen'])
    expect(byPlayer[2]?.map(g => g.name)).toEqual(['Control'])
    expect(byPlayer[3]?.map(g => g.name)).toEqual(['Dividends'])
  })

  it('COMBAT_REWARDS shows this conflict’s applied gains, not unclaimed trash', () => {
    const state = baseState({
      phase: GamePhase.COMBAT_REWARDS,
      currentRound: 7,
      currentConflict: { id: 914, name: 'Terrible Purpose' } as GameState['currentConflict'],
      currTurn: null,
      activePlayerId: 0,
      gains: [
        {
          playerId: 0,
          source: GainSource.CONFLICT,
          sourceId: 914,
          round: 7,
          name: 'Terrible Purpose - 1st place',
          amount: 1,
          type: RewardType.VICTORY_POINTS,
        },
        {
          playerId: 1,
          source: GainSource.BOARD_SPACE,
          sourceId: 1,
          round: 6,
          name: 'Arrakeen',
          amount: 1,
          type: RewardType.SOLARI,
        },
      ],
      pendingRewards: [
        {
          id: 'trash-p0',
          source: { type: GainSource.CONFLICT, id: 914, name: 'Terrible Purpose - 1st place' },
          reward: { trash: 1 },
          isTrash: true,
          playerId: 0,
        },
      ],
    })

    const byPlayer = buildBirdseyeGainsByPlayer(state)
    expect(byPlayer[0]?.map(g => g.type)).toEqual([RewardType.VICTORY_POINTS])
    expect(byPlayer[1]).toBeUndefined()
  })

  it('live COMBAT_REWARDS shows only the seat that must press Continue', () => {
    const vp = {
      playerId: 0,
      source: GainSource.CONFLICT,
      sourceId: 914,
      round: 7,
      name: 'Terrible Purpose - 1st place',
      amount: 1,
      type: RewardType.VICTORY_POINTS,
    }
    const spice = {
      ...vp,
      playerId: 1,
      name: 'Terrible Purpose - 2nd place',
      type: RewardType.SPICE,
    }
    const byPlayer = buildBirdseyeGainsByPlayer(
      baseState({
        phase: GamePhase.COMBAT_REWARDS,
        activePlayerId: 1,
        currentConflict: { id: 914, name: 'Terrible Purpose' } as GameState['currentConflict'],
        gains: [vp, spice],
      })
    )
    expect(byPlayer[0]).toBeUndefined()
    expect(byPlayer[1]?.map(gain => gain.type)).toEqual([RewardType.SPICE])
  })

  it('a conflict-rewards history row shows every seat', () => {
    const vp = {
      playerId: 0,
      source: GainSource.CONFLICT,
      sourceId: 914,
      round: 6,
      name: 'Terrible Purpose - 1st place',
      amount: 1,
      type: RewardType.VICTORY_POINTS,
    }
    const spice = {
      ...vp,
      playerId: 1,
      name: 'Terrible Purpose - 2nd place',
      type: RewardType.SPICE,
    }
    const byPlayer = buildBirdseyeGainsByPlayer(
      baseState({
        phase: GamePhase.ROUND_START,
        historyEntryKind: 'conflict-rewards',
        activePlayerId: 0,
        currentConflict: { id: 914, name: 'Terrible Purpose' } as GameState['currentConflict'],
        gains: [vp, spice],
      })
    )
    expect(byPlayer[0]?.map(gain => gain.type)).toEqual([RewardType.VICTORY_POINTS])
    expect(byPlayer[1]?.map(gain => gain.type)).toEqual([RewardType.SPICE])
  })

  it('COMBAT_REWARDS does not double an identical conflict gain', () => {
    const gain = {
      playerId: 0,
      source: GainSource.CONFLICT,
      sourceId: 914,
      round: 7,
      name: 'Terrible Purpose - 1st place',
      amount: 1,
      type: RewardType.VICTORY_POINTS,
    }
    const byPlayer = buildBirdseyeGainsByPlayer(
      baseState({
        phase: GamePhase.COMBAT_REWARDS,
        activePlayerId: 0,
        currentConflict: { id: 914, name: 'Terrible Purpose' } as GameState['currentConflict'],
        gains: [gain, { ...gain }],
      })
    )
    expect(byPlayer[0]).toHaveLength(1)
    expect(byPlayer[0]?.[0].amount).toBe(1)
  })
})

describe('birdseyeTroopDeployCounts', () => {
  it('includes dreadnoughts deployed this turn beside troops', () => {
    expect(
      birdseyeTroopDeployCounts(
        baseState({
          currTurn: {
            playerId: 1,
            type: TurnType.ACTION,
            removableTroops: 3,
            removableDreadnoughts: 1,
            troopsRetreatedFromConflict: 0,
          },
        })
      )
    ).toEqual({ deployed: 3, dreadnoughts: 1, retreated: 0 })
  })
})
