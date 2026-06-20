import {
  AgentIcon,
  GamePhase,
  Leader,
  PlayerColor,
  TurnType,
  type Card,
  type GameState,
  type Player,
} from '../../../types/GameTypes'
import { intrigueCards } from '../../../services/IntrigueDeckService'
import { seedTroopSupply } from '../../../utils/troops'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'

export function stubDeckCard(id: number, overrides: Partial<Card> = {}): Card {
  return {
    id,
    name: `stub-${id}`,
    image: '',
    agentIcons: [AgentIcon.CITY],
    ...overrides,
  }
}

export function makeLeader(name = 'Test'): Leader {
  return new Leader(
    name,
    { name: 'Ability', description: 'Test ability' },
    'Signet text',
    1
  )
}

export function makePlayer(id: number, overrides: Partial<Player> = {}): Player {
  const colors = [
    PlayerColor.RED,
    PlayerColor.BLUE,
    PlayerColor.GREEN,
    PlayerColor.YELLOW,
  ]
  const player = {
    id,
    color: colors[id % 4] ?? PlayerColor.RED,
    leader: makeLeader(`Leader ${id}`),
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
    handCount: 5,
    revealed: false,
    intrigueCount: 1,
    deck: [stubDeckCard(5000 + id)],
    discardPile: [],
    playArea: [],
    trash: [],
    ...overrides,
  }
  return 'troopSupply' in overrides ? player : seedTroopSupply(player)
}

/** Single-player agent/reveal tests with intrigue deck seeded. */
export function getBaseTestState(
  playerOverrides?: Partial<Player>,
  opts?: { players?: number; activeId?: number }
): GameState {
  const playerCount = opts?.players ?? 1
  const activeId = opts?.activeId ?? 0
  const players = Array.from({ length: playerCount }, (_, i) =>
    makePlayer(i, i === 0 ? playerOverrides : undefined)
  )
  const s = getFreshDefaultGameState()
  return {
    ...s,
    players,
    phase: GamePhase.PLAYER_TURNS,
    activePlayerId: activeId,
    firstPlayerMarker: 0,
    intrigueDeck: [...intrigueCards],
    combatPasses: new Set(),
    endgameDonePlayers: new Set(),
    currTurn: null,
    selectedCard: null,
    selectedCardDeckIndex: null,
    combatTroops: {},
    combatStrength: {},
    mentatOwner: null,
  }
}

export function withCardOnTop(state: GameState, playerId: number, card: Card): GameState {
  const players = state.players.map((p, i) =>
    i === playerId ? { ...p, deck: [card, ...p.deck] } : p
  )
  return { ...state, players }
}

export function snapshotAfterAgentTurn(
  state: GameState,
  playerId: number,
  cardId: number,
  spaceId: number
): GameState {
  let s = state
  s = {
    ...s,
    activePlayerId: playerId,
    currTurn: { playerId, type: TurnType.ACTION },
  }
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId, cardId })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId, spaceId })
  s = applyGameAction(s, { type: 'END_TURN', playerId })
  return s
}
