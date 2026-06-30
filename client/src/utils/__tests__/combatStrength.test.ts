import { describe, expect, it } from 'vitest'
import { computeStrength } from '../combatStrength'
import { dreadnoughtStrengthEach } from '../../data/leaderAbilities/rhomburDreadnoughtStrength'
import {
  ControlMarkerType,
  GamePhase,
  Leader,
  PlayerColor,
  type GameState,
  type Player,
} from '../../types/GameTypes'

function stubLeader(name = 'Test'): Leader {
  return new Leader(name, { name: 'A', description: 'B' }, 'C', 1)
}

function rhombur(): Leader {
  return stubLeader('Prince Rhombur Vernius')
}

function stubPlayer(id: number, overrides: Partial<Player> = {}): Player {
  return {
    id,
    color: PlayerColor.RED,
    leader: stubLeader(),
    troops: 0,
    spice: 0,
    water: 0,
    solari: 0,
    victoryPoints: 0,
    agents: 2,
    persuasion: 0,
    combatValue: 0,
    hasSwordmaster: false,
    hasHighCouncilSeat: false,
    handCount: 0,
    revealed: false,
    intrigueCount: 0,
    deck: [],
    discardPile: [],
    playArea: [],
    trash: [],
    ...overrides,
  }
}

function stubState(
  players: Player[],
  combatTroops: Record<number, number> = {},
  riseOfIx = true
): GameState {
  return {
    phase: GamePhase.PLAYER_TURNS,
    factionInfluence: {} as GameState['factionInfluence'],
    factionAlliances: {} as GameState['factionAlliances'],
    spiceMustFlowDeck: [],
    arrakisLiaisonDeck: [],
    foldspaceDeck: [],
    imperiumRowDeck: [],
    imperiumRow: [],
    intrigueDeck: [],
    intrigueDiscard: [],
    conflictsDiscard: [],
    controlMarkers: {
      [ControlMarkerType.ARRAKIN]: null,
      [ControlMarkerType.CARTHAG]: null,
      [ControlMarkerType.IMPERIAL_BASIN]: null,
    },
    bonusSpice: {} as GameState['bonusSpice'],
    history: [],
    players,
    firstPlayerMarker: 0,
    currentRound: 1,
    mentatOwner: null,
    highCouncilSeatOrder: [],
    activePlayerId: 0,
    gains: [],
    selectedCard: null,
    selectedCardDeckIndex: null,
    currTurn: null,
    combatStrength: {},
    combatTroops,
    currentConflict: { id: 0, tier: 1, name: 'X', rewards: { first: [], second: [], third: [] } },
    combatPasses: new Set(),
    occupiedSpaces: {},
    playArea: {},
    canEndTurn: false,
    canAcquireIR: false,
    pendingRewards: [],
    scheduledIntrigueOnReveal: {},
    activeIntrigueThisRound: {},
    acquireToTopThisRound: {},
    endgameTiebreakerSpice: {},
    endgameDonePlayers: new Set(),
    endgameWinners: null,
    pendingImperiumRowReplacement: null,
    expansions: { riseOfIx, riseOfIxEpic: false },
  }
}

describe('computeStrength', () => {
  it('troops=0, dreads=0 -> 0', () => {
    const state = stubState([stubPlayer(0)])
    expect(computeStrength(state, 0)).toBe(0)
  })

  it('troops=2, dreads=0, swords=1 -> 5 when revealed', () => {
    const state = stubState(
      [stubPlayer(0, { combatValue: 5, revealed: true })],
      { 0: 2 }
    )
    expect(computeStrength(state, 0)).toBe(5)
  })

  it('agent turn ignores stale combatValue and uses units only', () => {
    const state = stubState(
      [stubPlayer(0, { combatValue: 8 })],
      { 0: 2 },
      false
    )
    expect(computeStrength(state, 0)).toBe(4)
  })

  it('troops=0, dreads=1, swords=2 -> 5 when revealed (no zero rule)', () => {
    const state = stubState([
      stubPlayer(0, {
        combatValue: 5,
        revealed: true,
        dreadnoughts: { supply: 0, garrison: 0, conflict: 1, control: [] },
      }),
    ])
    expect(computeStrength(state, 0)).toBe(5)
  })

  it('troops=2, dreads=2, swords=0, Rhombur -> 12', () => {
    const state = stubState([
      stubPlayer(0, {
        leader: rhombur(),
        dreadnoughts: { supply: 0, garrison: 0, conflict: 2, control: [] },
      }),
    ], { 0: 2 })
    const expected = 2 * 2 + 2 * dreadnoughtStrengthEach(rhombur())
    expect(computeStrength(state, 0)).toBe(expected)
    expect(expected).toBe(12)
  })
})
