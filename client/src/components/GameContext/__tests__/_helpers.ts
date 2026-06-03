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
import { BOARD_SPACES } from '../../../data/boardSpaces'
import { CONFLICTS } from '../../../data/conflicts'
import { intrigueCards } from '../../../services/IntrigueDeckService'
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
  return {
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

export function findSpaceForAgentIcon(
  icon: AgentIcon,
  player: Player,
  factionInfluence: GameState['factionInfluence'] = {
    emperor: {},
    spacingGuild: {},
    beneGesserit: {},
    fremen: {},
  }
): number | null {
  const candidates = BOARD_SPACES.filter(s => s.agentIcon === icon)
  const sorted = [...candidates].sort((a, b) => {
    const costA = (a.cost?.solari ?? 0) + (a.cost?.spice ?? 0) + (a.cost?.water ?? 0)
    const costB = (b.cost?.solari ?? 0) + (b.cost?.spice ?? 0) + (b.cost?.water ?? 0)
    return costA - costB
  })
  for (const space of sorted) {
    if (space.requiresInfluence) {
      const inf =
        factionInfluence[space.requiresInfluence.faction as keyof typeof factionInfluence]?.[
          player.id
        ] ?? 0
      if (inf < space.requiresInfluence.amount) continue
    }
    if (space.cost?.solari && player.solari < space.cost.solari) continue
    if (space.cost?.spice && player.spice < space.cost.spice) continue
    if (space.cost?.water && player.water < space.cost.water) continue
    return space.id
  }
  return candidates[0]?.id ?? null
}

export function claimAllPendingRewards(state: GameState, playerId: number): GameState {
  let s = state
  for (let guard = 0; guard < 50; guard++) {
    const next = s.pendingRewards.find(r => !r.disabled)
    if (!next) break
    s = applyGameAction(s, {
      type: 'CLAIM_REWARD',
      playerId,
      rewardId: next.id,
    })
  }
  return s
}

export function playAgentTurn(
  state: GameState,
  playerId: number,
  cardId: number,
  spaceId: number
): GameState {
  let s = { ...state, activePlayerId: playerId }
  s = applyGameAction(s, { type: 'PLAY_CARD', playerId, cardId })
  s = applyGameAction(s, { type: 'PLACE_AGENT', playerId, spaceId })
  return claimAllPendingRewards(s, playerId)
}

export function beginPlayerTurns(
  state: GameState,
  conflictId: number = CONFLICTS[0].id
): GameState {
  return applyGameAction(state, { type: 'SELECT_CONFLICT', conflictId })
}

export function finishAgentTurn(state: GameState, playerId: number): GameState {
  let s = claimAllPendingRewards(state, playerId)
  return applyGameAction(s, { type: 'END_TURN', playerId })
}

export function snapshotAfterAgentTurn(
  state: GameState,
  playerId: number,
  cardId: number,
  spaceId: number
): GameState {
  let s = playAgentTurn(state, playerId, cardId, spaceId)
  return applyGameAction(s, { type: 'END_TURN', playerId })
}
