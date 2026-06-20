import { describe, expect, it } from 'vitest'
import { unitsInConflictForPlayer } from '../dreadnoughts'
import {
  ControlMarkerType,
  GamePhase,
  Leader,
  NO_EXPANSIONS,
  PlayerColor,
  type GameState,
  type Player,
} from '../../types/GameTypes'

function stubLeader(): Leader {
  return new Leader('Test', { name: 'A', description: 'B' }, 'C', 1)
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

function stubState(players: Player[], combatTroops: Record<number, number> = {}): GameState {
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
    expansions: NO_EXPANSIONS,
  }
}

describe('dreadnoughts', () => {
  it('unitsInConflictForPlayer returns combatTroops only when dreadnoughts.conflict is 0', () => {
    const state = stubState([stubPlayer(0)], { 0: 3 })
    expect(unitsInConflictForPlayer(state, 0)).toBe(3)
  })

  it('unitsInConflictForPlayer adds dreadnoughts.conflict to combatTroops', () => {
    const state = stubState(
      [
        stubPlayer(0, {
          dreadnoughts: { supply: 0, garrison: 0, conflict: 2, control: [] },
        }),
      ],
      { 0: 3 }
    )
    expect(unitsInConflictForPlayer(state, 0)).toBe(5)
  })

  it('unitsInConflictForPlayer returns 0 if player not found', () => {
    const state = stubState([], { 0: 4 })
    expect(unitsInConflictForPlayer(state, 0)).toBe(0)
  })
})
