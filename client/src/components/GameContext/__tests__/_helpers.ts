import {
  AgentIcon,
  GamePhase,
  Leader,
  NO_EXPANSIONS,
  PlayerColor,
  TurnType,
  type Card,
  type GameState,
  type Player,
} from '../../../types/GameTypes'
import { RISE_OF_IX_IMPERIUM_DECK } from '../../../data/cardsRiseOfIx'
import { TechTileId } from '../../../data/techTiles'
import { intrigueCards } from '../../../services/IntrigueDeckService'
import { DEFAULT_DREADNOUGHTS } from '../../../utils/dreadnoughts'
import { seedTroopSupply } from '../../../utils/troops'
import { applyGameAction, getFreshDefaultGameState } from '../GameContext'
import { buildIxBoardFromFaceUpTiles } from '../riseOfIxReducer'

export const ROI_EXPANSIONS = { ...NO_EXPANSIONS, riseOfIx: true, riseOfIxEpic: false }

const TECH_TILES_POOL_FOR_TESTS = Object.values(TechTileId).filter(
  id =>
    id !== TechTileId.MINIMIC_FILM &&
    id !== TechTileId.WINDTRAPS &&
    id !== TechTileId.ARTILLERY
)

/** Deterministic Ix board for reducer tests (3 face-up stacks). */
export function defaultRoiIxBoard() {
  return buildIxBoardFromFaceUpTiles(
    [TechTileId.MINIMIC_FILM, TechTileId.WINDTRAPS, TechTileId.ARTILLERY],
    TECH_TILES_POOL_FOR_TESTS
  )
}

export function cloneRoiCard(name: string): Card {
  const card = RISE_OF_IX_IMPERIUM_DECK.find(c => c.name === name)
  if (!card) throw new Error(`RoI card not found: ${name}`)
  return structuredClone(card)
}

/**
 * Rise of Ix game state with expansion flag, Ix board, and dreadnought supply seeded.
 * Extend via playerOverrides on the active player (default id 0).
 */
export function getRoiTestState(opts?: {
  players?: number
  activeId?: number
  playerOverrides?: Partial<Player>
  stateOverrides?: Partial<GameState>
}): GameState {
  const playerCount = opts?.players ?? 1
  const activeId = opts?.activeId ?? 0
  const players = Array.from({ length: playerCount }, (_, i) =>
    makePlayer(i, {
      freighterStep: 0,
      tech: [],
      negotiatorsOnIx: 0,
      dreadnoughts: { ...DEFAULT_DREADNOUGHTS },
      ...(i === activeId ? opts?.playerOverrides : undefined),
    })
  )
  const s = getFreshDefaultGameState()
  return {
    ...s,
    expansions: ROI_EXPANSIONS,
    players,
    ixBoard: defaultRoiIxBoard(),
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
    ...opts?.stateOverrides,
  }
}

/** Play one RoI card agent turn: PLAY_CARD → PLACE_AGENT → END_TURN. */
export function playRoiAgentTurn(
  state: GameState,
  playerId: number,
  card: Card,
  spaceId: number
): GameState {
  let s = withCardOnTop(state, playerId, card)
  s = {
    ...s,
    activePlayerId: playerId,
    currTurn: { playerId, type: TurnType.ACTION },
  }
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId, cardId: card.id })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId, spaceId })
  s = applyGameAction(s, { type: 'END_TURN', playerId })
  return s
}

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
