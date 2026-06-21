import { describe, expect, it } from 'vitest'
import { intrigueCards } from '../../../services/IntrigueDeckService'
import {
  AgentIcon,
  GamePhase,
  PlayerColor,
  TurnType,
  type Card,
  type GameState,
  type Leader,
  type Player,
} from '../../../types/GameTypes'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { stubDeckCard } from './_helpers'
import { seedTroopSupply } from '../../../utils/troops'

function makeLeader(): Leader {
  return {
    name: 'Test',
    ability: { name: 'Ability', description: 'Test ability' },
    signetRingText: 'Signet text',
    id: 1,
  }
}

function makePlayer(id: number, overrides: Partial<Player> = {}): Player {
  const colors = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW]
  const player = {
    id,
    color: colors[id % 4] ?? PlayerColor.RED,
    leader: makeLeader(),
    troops: 8,
    spice: 10,
    water: 3,
    solari: 20,
    victoryPoints: 0,
    agents: 2,
    persuasion: 0,
    combatValue: 0,
    hasSwordmaster: false,
    hasHighCouncilSeat: false,
    handCount: 0,
    revealed: true,
    intrigueCount: 1,
    deck: [stubDeckCard(5001)],
    discardPile: [],
    playArea: [stubDeckCard(9001)],
    trash: [],
    ...overrides,
  }
  return 'troopSupply' in overrides ? player : seedTroopSupply(player)
}

function revealStateWithRow(target: Card, persuasion: number): GameState {
  const s = getFreshDefaultGameState()
  return {
    ...s,
    players: [makePlayer(0, { persuasion })],
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: 0,
    firstPlayerMarker: 0,
    intrigueDeck: [...intrigueCards],
    combatPasses: new Set(),
    endgameDonePlayers: new Set(),
    imperiumRow: [target],
    canAcquireIR: true,
    currTurn: {
      playerId: 0,
      type: TurnType.REVEAL,
      persuasionCount: persuasion,
      revealedCardIds: [9001],
    },
    combatTroops: {},
    combatStrength: {},
    mentatOwner: null,
  }
}

describe('Recruitment Mission during reveal turn', () => {
  it('sets acquire-to-top flag and applies it when player chooses top after playing intrigue post-reveal', () => {
    const target = stubDeckCard(9206, { cost: 6, agentIcons: [AgentIcon.CITY] })
    let s = revealStateWithRow(target, 24)

    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 21 })
    expect(s.acquireToTopThisRound[0]).toBe(true)
    expect(s.players[0].water).toBe(4)

    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9206, acquireToTop: true })
    expect(s.players[0].deck.map(c => c.id)).toEqual([9206, 5001])
    expect(s.players[0].discardPile).toEqual([])
  })

  it('goes to discard when player chooses discard despite the flag', () => {
    const target = stubDeckCard(9206, { cost: 6, agentIcons: [AgentIcon.CITY] })
    let s = revealStateWithRow(target, 24)

    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 21 })
    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9206, acquireToTop: false })

    expect(s.players[0].deck.map(c => c.id)).toEqual([5001])
    expect(s.players[0].discardPile.map(c => c.id)).toEqual([9206])
  })

  it('applies acquire-to-top when intrigue was played before reveal and player chooses top', () => {
    const target = stubDeckCard(9207, { cost: 6, agentIcons: [AgentIcon.CITY] })
    let s = getFreshDefaultGameState()
    s = {
      ...s,
      players: [makePlayer(0, { revealed: false, handCount: 1, persuasion: 0, deck: [stubDeckCard(5001)] })],
      phase: GamePhase.PLAYER_TURNS,
      activePlayerId: 0,
      intrigueDeck: [...intrigueCards],
      imperiumRow: [target],
      combatPasses: new Set(),
      endgameDonePlayers: new Set(),
      currTurn: null,
    }

    s = applyGameAction(s, { type: 'PLAY_INTRIGUE', playerId: 0, cardId: 21 })
    expect(s.acquireToTopThisRound[0]).toBe(true)

    s = applyGameAction(s, { type: 'REVEAL_CARDS', playerId: 0, cardIds: [5001] })
    s = { ...s, players: s.players.map(p => (p.id === 0 ? { ...p, persuasion: 24 } : p)) }

    s = applyGameAction(s, { type: 'ACQUIRE_CARD', playerId: 0, cardId: 9207, acquireToTop: true })
    expect(s.players[0].deck[0]?.id).toBe(9207)
    expect(s.players[0].discardPile.some(c => c.id === 9207)).toBe(false)
  })
})
