import { describe, it, expect } from 'vitest'
import {
  updateFactionInfluence,
  FOURTH_INFLUENCE_MILESTONE_REWARDS,
  mergePlayerAfterFactionInfluence,
} from '../influenceVictoryPoints'
import {
  FactionType,
  GamePhase,
  Leader,
  PlayerColor,
  RewardType,
  type GameState,
  type Player,
} from '../../types/GameTypes'

import { seedTroopSupply } from '../troops'

function makePlayer(id: number, overrides: Partial<Player> = {}): Player {
  const colors = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW]
  const player = {
    id,
    color: colors[id % 4] ?? PlayerColor.RED,
    leader: new Leader('Test', { name: 'Ability', description: '' }, 'Signet', 1),
    troops: 5,
    spice: 0,
    water: 0,
    solari: 0,
    victoryPoints: 0,
    agents: 2,
    persuasion: 0,
    combatValue: 0,
    hasSwordmaster: false,
    hasHighCouncilSeat: false,
    handCount: 5,
    revealed: false,
    intrigueCount: 0,
    deck: [],
    discardPile: [],
    playArea: [],
    trash: [],
    ...overrides,
  }
  return 'troopSupply' in overrides ? player : seedTroopSupply(player)
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return {
    players: [makePlayer(0), makePlayer(1)],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    currentRound: 1,
    factionInfluence: {
      [FactionType.EMPEROR]: { 0: 0, 1: 0 },
      [FactionType.SPACING_GUILD]: { 0: 0, 1: 0 },
      [FactionType.BENE_GESSERIT]: { 0: 0, 1: 0 },
      [FactionType.FREMEN]: { 0: 0, 1: 0 },
    },
    factionAlliances: {},
    gains: [],
    ...overrides,
  } as GameState
}

describe('updateFactionInfluence second-influence VP gains', () => {
  it('grants +1 VP gain when crossing from 1 to 2', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.BENE_GESSERIT]: { 0: 1, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.BENE_GESSERIT, 0, 1)
    expect(next.gains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 0,
          type: RewardType.VICTORY_POINTS,
          amount: 1,
          name: `${FactionType.BENE_GESSERIT} 2nd Influence`,
        }),
      ])
    )
  })

  it('grants +1 VP once when jumping from 0 to 3 in a single step', () => {
    const next = updateFactionInfluence(
      baseState(),
      FactionType.BENE_GESSERIT,
      0,
      3
    )
    expect(
      next.gains.filter(
        g => g.type === RewardType.VICTORY_POINTS && g.name?.includes('2nd Influence')
      )
    ).toHaveLength(1)
  })

  it('records -1 VP when dropping below 2 influence', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.BENE_GESSERIT]: { 0: 2, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.BENE_GESSERIT, 0, -1)
    expect(next.gains).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: 0,
          type: RewardType.VICTORY_POINTS,
          amount: -1,
          name: `${FactionType.BENE_GESSERIT} 2nd Influence lost`,
        }),
      ])
    )
  })

  it('does not grant 2nd-influence VP when already at 2 or higher', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.BENE_GESSERIT]: { 0: 2, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.BENE_GESSERIT, 0, 1)
    expect(
      next.gains.filter(g => g.name?.includes('2nd Influence'))
    ).toHaveLength(0)
  })
})

describe('updateFactionInfluence fourth-influence milestone rewards', () => {
  it('grants Emperor milestone (2 troops) when crossing from 3 to 4', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.EMPEROR]: { 0: 3, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.EMPEROR, 0, 1)
    expect(next.factionInfluence[FactionType.EMPEROR]?.[0]).toBe(4)
    expect(next.players[0].troops).toBe(7)
    expect(next.gains.some(g => g.type === RewardType.TROOPS && g.amount === 2)).toBe(true)
  })

  it('grants Spacing Guild milestone (3 solari) when crossing to 4', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.SPACING_GUILD]: { 0: 3, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.SPACING_GUILD, 0, 1)
    expect(next.players[0].solari).toBe(3)
  })

  it('grants Bene Gesserit milestone (1 intrigue) when crossing to 4', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.BENE_GESSERIT]: { 0: 3, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.BENE_GESSERIT, 0, 1)
    expect(next.players[0].intrigueCount).toBe(1)
  })

  it('grants Fremen milestone (1 water) when crossing to 4', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.FREMEN]: { 0: 3, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.FREMEN, 0, 1)
    expect(next.players[0].water).toBe(1)
  })

  it('grants milestone once when jumping from 3 to 5 in a single step', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.EMPEROR]: { 0: 3, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.EMPEROR, 0, 2)
    expect(next.factionInfluence[FactionType.EMPEROR]?.[0]).toBe(5)
    expect(next.players[0].troops).toBe(7)
    expect(next.gains.filter(g => g.type === RewardType.TROOPS && g.amount === 2)).toHaveLength(1)
  })

  it('does not grant milestone when already at 4 or higher', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.EMPEROR]: { 0: 4, 1: 0 },
      },
    })
    const next = updateFactionInfluence(state, FactionType.EMPEROR, 0, 1)
    expect(next.players[0].troops).toBe(5)
    expect(next.gains.filter(g => g.name?.includes('4th Influence'))).toHaveLength(0)
  })

  it('mergePlayerAfterFactionInfluence avoids double-counting synced milestone resources', () => {
    const baseline = makePlayer(0, { intrigueCount: 1 })
    const state = baseState({ players: [baseline, makePlayer(1)] })
    const afterInfluence = {
      ...state,
      players: [
        { ...baseline, intrigueCount: 2 },
        state.players[1],
      ],
    }
    const local = { ...baseline, intrigueCount: 2 }
    const merged = mergePlayerAfterFactionInfluence(local, afterInfluence, baseline)
    expect(merged.intrigueCount).toBe(2)
  })

  it('mergePlayerAfterFactionInfluence preserves local resource spends not yet on state', () => {
    const baseline = makePlayer(0, { water: 3, spice: 10 })
    const state = baseState({ players: [baseline, makePlayer(1)] })
    const local = { ...baseline, water: 2, spice: 9 }
    const merged = mergePlayerAfterFactionInfluence(local, state, baseline)
    expect(merged.water).toBe(2)
    expect(merged.spice).toBe(9)
  })

  it('mergePlayerAfterFactionInfluence preserves local rewards plus milestones', () => {
    const state = baseState({
      factionInfluence: {
        ...baseState().factionInfluence,
        [FactionType.EMPEROR]: { 0: 3, 1: 0 },
      },
    })
    const baseline = { ...state.players[0] }
    const afterInfluence = updateFactionInfluence(state, FactionType.EMPEROR, 0, 1)
    const local = { ...baseline, solari: baseline.solari + 2 }
    const merged = mergePlayerAfterFactionInfluence(local, afterInfluence, baseline)
    expect(merged.troops).toBe(7)
    expect(merged.solari).toBe(2)
  })
})

describe('FOURTH_INFLUENCE_MILESTONE_REWARDS', () => {
  it('matches base-game faction bonuses', () => {
    expect(FOURTH_INFLUENCE_MILESTONE_REWARDS[FactionType.EMPEROR]).toEqual({ troops: 2 })
    expect(FOURTH_INFLUENCE_MILESTONE_REWARDS[FactionType.SPACING_GUILD]).toEqual({ solari: 3 })
    expect(FOURTH_INFLUENCE_MILESTONE_REWARDS[FactionType.BENE_GESSERIT]).toEqual({ intrigueCards: 1 })
    expect(FOURTH_INFLUENCE_MILESTONE_REWARDS[FactionType.FREMEN]).toEqual({ water: 1 })
  })
})
