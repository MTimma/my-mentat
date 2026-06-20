import { describe, expect, it } from 'vitest'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { computeStrength } from '../../../utils/combatStrength'
import { dreadnoughtStrengthEach } from '../../../data/leaderAbilities/rhomburDreadnoughtStrength'
import {
  AgentIcon,
  ChoiceType,
  ControlMarkerType,
  GamePhase,
  Leader,
  RewardType,
  TurnType,
  type Card,
  type GameState,
  type Player,
} from '../../../types/GameTypes'
import { makePlayer } from './_helpers'

const ROI = { riseOfIx: true, riseOfIxEpic: false }

function stubLeader(name = 'Test'): Leader {
  return new Leader(name, { name: 'A', description: 'B' }, 'C', 1)
}

function rhombur(): Leader {
  return stubLeader('Prince Rhombur Vernius')
}

function combatSpaceId(): number {
  return 3 // Research Station — CITY + conflictMarker
}

function nonCombatSpaceId(): number {
  return 15 // Wealth — available on RoI board, no conflict
}

function cityCard(id: number): Card {
  return {
    id,
    name: `city-${id}`,
    image: '',
    agentIcons: [AgentIcon.CITY],
    playEffect: [{ reward: { dreadnoughts: 1 } }],
  }
}

function roiState(players: Player[], overrides: Partial<GameState> = {}): GameState {
  const base = getFreshDefaultGameState()
  return {
    ...base,
    expansions: ROI,
    players,
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    firstPlayerMarker: 0,
    combatTroops: {},
    combatStrength: {},
    combatPasses: new Set(),
    currTurn: null,
    selectedCard: null,
    selectedCardDeckIndex: null,
    ...overrides,
  }
}

function withDreadnoughts(p: Player, d: Partial<NonNullable<Player['dreadnoughts']>>): Player {
  return {
    ...p,
    dreadnoughts: {
      supply: 2,
      garrison: 0,
      conflict: 0,
      control: [],
      ...d,
    },
  }
}

describe('dreadnought lifecycle (GameContext)', () => {
  it('COMMISSION reward to garrison increments dreadnoughts.garrison', () => {
    const card = cityCard(9001)
    let s = roiState([
      withDreadnoughts(makePlayer(0, { deck: [card], handCount: 1 }), { supply: 2 }),
    ])
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: nonCombatSpaceId() })
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
    expect(s.players[0].dreadnoughts?.supply).toBe(1)
  })

  it('COMMISSION to garrison capped at 2 active', () => {
    const card = cityCard(9002)
    let s = roiState([
      withDreadnoughts(makePlayer(0, { deck: [card], handCount: 1 }), {
        supply: 2,
        garrison: 2,
      }),
    ])
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: nonCombatSpaceId() })
    expect(s.players[0].dreadnoughts?.garrison).toBe(2)
    expect(s.players[0].dreadnoughts?.supply).toBe(2)
    expect(s.gains.some(g => g.type === RewardType.DREADNOUGHT)).toBe(false)
  })

  it('COMMISSION while at combat space asks for OR choice', () => {
    const card = cityCard(9003)
    let s = roiState([
      withDreadnoughts(makePlayer(0, { deck: [card], handCount: 1 }), { supply: 2 }),
    ])
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: combatSpaceId() })
    const choice = s.currTurn?.pendingChoices?.find(c => c.type === ChoiceType.FIXED_OPTIONS)
    expect(choice?.prompt).toBe('Commission dreadnought:')
  })

  it('Choosing Conflict deploys directly into dreadnoughts.conflict', () => {
    const card = cityCard(9004)
    let s = roiState([
      withDreadnoughts(makePlayer(0, { deck: [card], handCount: 1 }), { supply: 2 }),
    ])
    s = applyGameAction(s, { type: 'PLAY_CARD', playerId: 0, cardId: card.id })
    s = applyGameAction(s, { type: 'PLACE_AGENT', playerId: 0, spaceId: combatSpaceId() })
    const choice = s.currTurn?.pendingChoices?.[0]
    expect(choice?.id).toBeTruthy()
    s = applyGameAction(s, {
      type: 'RESOLVE_CHOICE',
      playerId: 0,
      choiceId: choice!.id,
      optionIndex: 1,
    })
    expect(s.players[0].dreadnoughts?.conflict).toBe(1)
    expect(s.players[0].dreadnoughts?.garrison).toBe(0)
  })

  it('computeStrength sums troops*2 + dreads*3 + swords', () => {
    const s = roiState([
      withDreadnoughts(makePlayer(0, { combatValue: 11 }), {
        supply: 0,
        conflict: 1,
      }),
    ], { combatTroops: { 0: 2 } })
    expect(computeStrength(s, 0)).toBe(11)
  })

  it('computeStrength for Rhombur uses 4 per dreadnought', () => {
    const leader = rhombur()
    const s = roiState([
      withDreadnoughts(makePlayer(0, { leader, combatValue: 4 }), {
        supply: 0,
        conflict: 1,
      }),
    ])
    expect(computeStrength(s, 0)).toBe(4)
    expect(dreadnoughtStrengthEach(leader)).toBe(4)
  })

  it('Strength >= 0 with no troops but with dreadnoughts', () => {
    const s = roiState([
      withDreadnoughts(makePlayer(0, { combatValue: 5 }), {
        supply: 0,
        conflict: 1,
      }),
    ])
    expect(computeStrength(s, 0)).toBe(5)
  })

  it('Winning combat with dreadnoughts produces a Control-space choice', () => {
    let s = roiState([
      withDreadnoughts(makePlayer(0, { combatValue: 6 }), {
        supply: 0,
        conflict: 1,
      }),
      makePlayer(1),
      makePlayer(2),
      makePlayer(3),
    ], {
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 6, 1: 0, 2: 0, 3: 0 },
      combatTroops: { 0: 0, 1: 0, 2: 0, 3: 0 },
    })
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    const dreadChoice = s.pendingConflictRewardChoices?.find(c =>
      c.id.startsWith('dreadnought-control')
    )
    expect(dreadChoice?.options).toHaveLength(3)
  })

  it('Dreadnought control choice omits spaces that already have a dreadnought', () => {
    let s = roiState(
      [
        withDreadnoughts(makePlayer(0, { combatValue: 6 }), {
          supply: 0,
          conflict: 1,
        }),
        withDreadnoughts(makePlayer(1), {
          supply: 0,
          garrison: 0,
          conflict: 0,
          control: [{ space: ControlMarkerType.ARRAKIN, placedRound: 1 }],
        }),
        makePlayer(2),
        makePlayer(3),
      ],
      {
        phase: GamePhase.COMBAT_REWARDS,
        combatStrength: { 0: 6, 1: 0, 2: 0, 3: 0 },
        combatTroops: { 0: 0, 1: 0, 2: 0, 3: 0 },
        dreadnoughtCover: {
          [ControlMarkerType.ARRAKIN]: 1,
          [ControlMarkerType.CARTHAG]: null,
          [ControlMarkerType.IMPERIAL_BASIN]: null,
        },
      }
    )
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    const dreadChoice = s.pendingConflictRewardChoices?.find(c =>
      c.id.startsWith('dreadnought-control')
    )
    expect(dreadChoice?.options).toHaveLength(2)
    expect(
      dreadChoice?.options.some(
        o => o.reward.dreadnoughtControlSpace === ControlMarkerType.ARRAKIN
      )
    ).toBe(false)
  })

  it('Picking Imperial Basin places dreadnought in dreadnoughts.control[0]', () => {
    let s = roiState([
      withDreadnoughts(makePlayer(0, { combatValue: 6 }), {
        supply: 0,
        conflict: 1,
      }),
      makePlayer(1),
      makePlayer(2),
      makePlayer(3),
    ], {
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 6, 1: 0, 2: 0, 3: 0 },
    })
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    const choice = s.pendingConflictRewardChoices?.find(c => c.id.startsWith('dreadnought-control'))
    expect(choice).toBeTruthy()
    const basinIndex = choice!.options.findIndex(
      o => o.reward.dreadnoughtControlSpace === ControlMarkerType.IMPERIAL_BASIN
    )
    s = applyGameAction(s, {
      type: 'RESOLVE_CONFLICT_REWARD_CHOICE',
      choiceId: choice!.id,
      optionIndex: basinIndex,
    })
    expect(s.players[0].dreadnoughts?.control[0]?.space).toBe(ControlMarkerType.IMPERIAL_BASIN)
  })

  it('dreadnoughtCover[space] is set to winnerId after the choice', () => {
    let s = roiState([
      withDreadnoughts(makePlayer(0, { combatValue: 6 }), {
        supply: 0,
        conflict: 1,
      }),
      makePlayer(1),
      makePlayer(2),
      makePlayer(3),
    ], {
      phase: GamePhase.COMBAT_REWARDS,
      combatStrength: { 0: 6, 1: 0, 2: 0, 3: 0 },
    })
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    const choice = s.pendingConflictRewardChoices?.find(c => c.id.startsWith('dreadnought-control'))!
    s = applyGameAction(s, {
      type: 'RESOLVE_CONFLICT_REWARD_CHOICE',
      choiceId: choice.id,
      optionIndex: 0,
    })
    const space = choice.options[0].reward.dreadnoughtControlSpace!
    expect(s.dreadnoughtCover?.[space]).toBe(0)
  })

  it('End of next Combat phase: dreadnought returns to garrison, cover clears', () => {
    let s = roiState([
      withDreadnoughts(makePlayer(0), {
        supply: 0,
        garrison: 0,
        conflict: 0,
        control: [{ space: ControlMarkerType.ARRAKIN, placedRound: 1 }],
      }),
    ], {
      phase: GamePhase.COMBAT_REWARDS,
      currentRound: 2,
      dreadnoughtCover: {
        [ControlMarkerType.ARRAKIN]: 0,
        [ControlMarkerType.CARTHAG]: null,
        [ControlMarkerType.IMPERIAL_BASIN]: null,
      },
      combatStrength: { 0: 0 },
    })
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
    expect(s.players[0].dreadnoughts?.control).toHaveLength(0)
    expect(s.dreadnoughtCover?.[ControlMarkerType.ARRAKIN]).toBeNull()
  })

  it('Losing combat returns dreadnoughts to garrison, not supply', () => {
    let s = roiState(
      [
        withDreadnoughts(makePlayer(0, { combatValue: 3 }), {
          supply: 1,
          conflict: 1,
        }),
        withDreadnoughts(makePlayer(1, { combatValue: 8 }), {
          supply: 1,
          conflict: 1,
        }),
        makePlayer(2),
        makePlayer(3),
      ],
      {
        phase: GamePhase.COMBAT_REWARDS,
        combatStrength: { 0: 3, 1: 8, 2: 0, 3: 0 },
        combatTroops: { 0: 0, 1: 0, 2: 0, 3: 0 },
      }
    )
    s = applyGameAction(s, { type: 'RESOLVE_COMBAT' })
    expect(s.players[0].dreadnoughts?.conflict).toBe(0)
    expect(s.players[0].dreadnoughts?.garrison).toBe(1)
    expect(s.players[0].dreadnoughts?.supply).toBe(1)
  })

  it('DEPLOY_DREADNOUGHT moves garrison to conflict', () => {
    let s = roiState([
      withDreadnoughts(makePlayer(0), { supply: 1, garrison: 1 }),
    ], {
      currTurn: {
        playerId: 0,
        type: TurnType.ACTION,
        canDeployTroops: true,
        troopLimit: 2,
        removableTroops: 0,
        removableDreadnoughts: 0,
        agentSpaceId: combatSpaceId(),
      },
    })
    s = applyGameAction(s, { type: 'DEPLOY_DREADNOUGHT', playerId: 0 })
    expect(s.players[0].dreadnoughts?.garrison).toBe(0)
    expect(s.players[0].dreadnoughts?.conflict).toBe(1)
  })
})
