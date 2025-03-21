import React, { createContext, useContext, useReducer } from 'react'
import { 
  GameState, 
  Player, 
  GamePhase,
  FactionType,
  ConflictCard,
  IntrigueCard,
  Card,
  Reward,
  IntrigueCardEffect,
  Winners,
  IntrigueCardType,
  GameTurn,
  TurnType,
  AgentIcon,
  SpaceProps
} from '../types/GameTypes'
import { boardSpaces } from '../components/GameBoard'

interface GameContextType {
  gameState: GameState
  players: Player[]
  currentConflict: ConflictCard | null
  imperiumRow: Card[]
  intrigueDeck: IntrigueCard[]
  dispatch: React.Dispatch<GameAction>
}

type GameAction = 
  | { type: 'START_ROUND' }
  | { type: 'END_TURN'; playerId: number }
  | { type: 'PLAY_CARD'; playerId: number; cardId: number }
  | { type: 'DEPLOY_AGENT'; playerId: number; spaceId: number }
  | { type: 'ADD_TROOP'; playerId: number }
  | { type: 'REMOVE_TROOP'; playerId: number }
  | { type: 'PLAY_INTRIGUE'; cardId: number; playerId: number; targetPlayerId?: number }
  | { type: 'GAIN_INFLUENCE'; playerId: number; faction: FactionType; amount: number }
  | { type: 'ACQUIRE_CARD'; playerId: number; cardId: number }
  | { type: 'DRAW_CARD'; playerId: number }
  | { type: 'GAIN_RESOURCE'; playerId: number; resource: 'spice' | 'water' | 'solari'; amount: number }
  | { type: 'START_COMBAT' }
  | { type: 'ADD_COMBAT_STRENGTH'; playerId: number; amount: number }
  | { type: 'PLAY_COMBAT_INTRIGUE'; playerId: number; cardId: number }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'START_COMBAT_PHASE' }
  | { type: 'PASS_COMBAT'; playerId: number }
  | { type: 'DRAW_INTRIGUE'; playerId: number }
  | { type: 'PLACE_AGENT'; playerId: number; spaceId: number }

const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

// Initial state setup
const initialGameState: GameState = {
  startingPlayerId: 1,
  currentRound: 1,
  activePlayerId: 1,
  phase: GamePhase.ROUND_START,
  lastTurn: null,
  mentatOwner: null,
  factionInfluence: {
    [FactionType.EMPEROR]: {},
    [FactionType.SPACING_GUILD]: {},
    [FactionType.BENE_GESSERIT]: {},
    [FactionType.FREMEN]: {}
  },
  factionAlliances: {
    [FactionType.EMPEROR]: null,
    [FactionType.SPACING_GUILD]: null,
    [FactionType.BENE_GESSERIT]: null,
    [FactionType.FREMEN]: null
  },
  controlMarkers: {
    arrakeen: null,
    carthag: null,
    imperialBasin: null
  },
  combatStrength: {},
  combatTroops: {},
  currentConflict: null,
  players: [],
  combatPasses: [],
  turns: [],
  occupiedSpaces: {},
  playArea: {} as Record<number, Card[]>
}

function calculateCombatStrength(
  troops: Record<number, number>,
  swordIcons: Record<number, number>
): Record<number, number> {
  const strength: Record<number, number> = {}
  
  Object.entries(troops).forEach(([playerId, troopCount]) => {
    const id = Number(playerId)
    strength[id] = (troopCount * 2) + (swordIcons[id] || 0)
  })
  
  return strength
}

function determineWinners(
  strength: Record<number, number>,
  playerCount: number
): { first: number | null, second: number | null, third: number | null } {
  const entries = Object.entries(strength)
    .map(([id, str]) => ({ id: Number(id), strength: str }))
    .filter(entry => entry.strength > 0)
    .sort((a, b) => b.strength - a.strength)

  return {
    first: entries[0]?.id || null,
    second: entries[1]?.id || null,
    third: playerCount === 4 ? entries[2]?.id || null : null
  }
}

function applyReward(state: GameState, reward: Reward, playerId: number): GameState {
  const newState = { ...state }
  
  switch (reward.type) {
    case 'victoryPoints':
      // Update victory points in player state
      newState.players = newState.players.map(player => 
        player.id === playerId 
          ? { ...player, victoryPoints: player.victoryPoints + reward.amount }
          : player
      )
      break

    case 'influence':
      if (reward.faction) {
        const currentInfluence = state.factionInfluence[reward.faction][playerId] || 0
        newState.factionInfluence = {
          ...state.factionInfluence,
          [reward.faction]: {
            ...state.factionInfluence[reward.faction],
            [playerId]: currentInfluence + reward.amount
          }
        }
      }
      break

    case 'control':
      if (state.currentConflict?.controlSpace) {
        newState.controlMarkers[state.currentConflict.controlSpace] = playerId
      }
      break

    case 'spice':
      newState.players = newState.players.map(player =>
        player.id === playerId
          ? { ...player, spice: player.spice + reward.amount }
          : player
      )
      break

    case 'water':
      newState.players = newState.players.map(player =>
        player.id === playerId
          ? { ...player, water: player.water + reward.amount }
          : player
      )
      break

    case 'solari':
      newState.players = newState.players.map(player =>
        player.id === playerId
          ? { ...player, solari: player.solari + reward.amount }
          : player
      )
      break

    case 'troops':
      newState.players = newState.players.map(player =>
        player.id === playerId
          ? { ...player, troops: player.troops + reward.amount }
          : player
      )
      break
  }

  return newState
}

function handleIntrigueEffect(
  state: GameState,
  effect: IntrigueCardEffect,
  playerId: number
): GameState {
  const newState = { ...state }

  if (effect.gainResource) {
    const { type, amount } = effect.gainResource
    newState.players = newState.players.map(player =>
      player.id === playerId
        ? { ...player, [type]: player[type] + amount }
        : player
    )
  }

  if (effect.gainInfluence && effect.gainInfluence.faction) {
    const { faction, amount } = effect.gainInfluence
    const currentInfluence = state.factionInfluence[faction][playerId] || 0
    newState.factionInfluence = {
      ...state.factionInfluence,
      [faction]: {
        ...state.factionInfluence[faction],
        [playerId]: currentInfluence + amount
      }
    }
  }

  if (effect.drawCards) {
    // Implement card drawing logic
  }

  return newState
}

// Game reducer
function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_ROUND':
      return {
        ...state,
        phase: GamePhase.PLAYER_TURNS
      }
    case 'END_TURN': {
      const { playerId } = action
      if (playerId !== state.activePlayerId) return state

      const player = state.players.find(p => p.id === playerId)
      if (!player) return state

      // Only allow ending turn if a card has been played
      if (!player.selectedCard) return state

      // Find next player
      const currentIndex = state.players.findIndex(p => p.id === playerId)
      const nextIndex = (currentIndex + 1) % state.players.length
      const nextPlayer = state.players[nextIndex]

      // Create new turn
      const newTurn: GameTurn = {
        playerId,
        type: TurnType.ACTION,
        cardId: player.selectedCard,
        agentSpaceTypes: [],
        canDeployTroops: false,
        troopLimit: 0,
        removableTroops: 0,
        persuasionCount: 0,
        gainedEffects: [],
        acquiredCards: []
      }

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...p,
                selectedCard: null
              }
            : p
        ),
        activePlayerId: nextPlayer.id,
        turns: [...state.turns, newTurn],
        lastTurn: newTurn
      }
    }
    case 'ADD_TROOP': {
      const player = state.players.find(p => p.id === action.playerId)
      if (!player || player.troops <= 0) return state

      const currentTroops = state.combatTroops[action.playerId] || 0
      const newState = {
        ...state,
        combatTroops: {
          ...state.combatTroops,
          [action.playerId]: currentTroops + 1
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, troops: p.troops - 1 }
            : p
        )
      }

      return newState
    }
    case 'REMOVE_TROOP': {
      const currentTroops = state.combatTroops[action.playerId] || 0
      if (currentTroops <= 0) return state

      const newState = {
        ...state,
        combatTroops: {
          ...state.combatTroops,
          [action.playerId]: currentTroops - 1
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, troops: p.troops + 1 }
            : p
        )
      }

      return newState
    }
    case 'START_COMBAT_PHASE':
      return {
        ...state,
        phase: GamePhase.COMBAT,
        combatPasses: []
      }
    case 'PASS_COMBAT': {
      return {
        ...state,
        combatPasses: [...state.combatPasses, action.playerId]
      }
    }
    case 'PLAY_COMBAT_INTRIGUE': {
      const { playerId, cardId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = player?.intrigueCards.find(c => c.id === cardId)

      if (!card || card.type !== IntrigueCardType.COMBAT) return state


      const newState = {
        ...state,
        combatPasses: []
      }

      const effect = (typeof card.effect === 'string') ? JSON.parse(card.effect) : card.effect
      if (effect.strengthBonus) {
        newState.combatStrength[playerId] = 
          (newState.combatStrength[playerId] || 0) + effect.strengthBonus
      }

      // Remove card from player's hand
      newState.players = newState.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              intrigueCards: p.intrigueCards.filter(c => c.id !== cardId)
            }
          : p
      )

      return newState
    }
    case 'RESOLVE_COMBAT': {
      if (!state.currentConflict) return state

      const strength = calculateCombatStrength(
        state.combatTroops,
        state.combatStrength
      )

      const winners = determineWinners(strength, state.players.length) as Winners

      let currentState = { ...state }

      if (winners.first !== null) {
        state.currentConflict.rewards.first.forEach(reward => {
          currentState = applyReward(currentState, reward, winners.first as number)
        })
      }

      if (winners.second !== null) {
        state.currentConflict.rewards.second.forEach(reward => {
          currentState = applyReward(currentState, reward, winners.second as number)
        })
      }

      if (winners.third !== null && state.players.length === 4) {
        state.currentConflict.rewards.third?.forEach(reward => {
          currentState = applyReward(currentState, reward, winners.third as number)
        })
      }

      // Reset combat state
      return {
        ...currentState,
        phase: GamePhase.MAKERS,
        combatStrength: {},
        combatTroops: {},
        currentConflict: null
      }
    }
    case 'PLAY_INTRIGUE': {
      const { cardId, playerId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = player?.intrigueCards.find(c => c.id === cardId)

      if (!card) return state

      const newState = handleIntrigueEffect(state, card.effect, playerId)

      newState.players = newState.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              intrigueCards: p.intrigueCards.filter(c => c.id !== cardId)
            }
          : p
      )

      return newState
    }
    case 'PLAY_CARD': {
      const { playerId, cardId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = player?.hand.find(c => c.id === cardId)

      if (!card || playerId !== state.activePlayerId) return state

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...p,
                selectedCard: cardId
              }
            : p
        )
      }
    }
    case 'PLACE_AGENT': {
      const { playerId, spaceId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = player?.hand.find(c => c.id === player?.selectedCard)
      const space = boardSpaces.find((s: SpaceProps) => s.id === spaceId)

      if (!player || !card || !space || playerId !== state.activePlayerId) return state

      // Check if player has any agents left
      if (player.agents <= 0) return state

      // Check if player can afford the space
      if (space.cost) {
        if (space.cost.solari && player.solari < space.cost.solari) return state
        if (space.cost.spice && player.spice < space.cost.spice) return state
        if (space.cost.water && player.water < space.cost.water) return state
      }

      // Check if space is already occupied
      if (state.occupiedSpaces[spaceId]?.length > 0) return state

      // Check if player has required influence
      if (space.requiresInfluence) {
        const playerInfluence = state.factionInfluence[space.requiresInfluence.faction]?.[playerId] || 0
        if (playerInfluence < space.requiresInfluence.amount) return state
      }

      // Deduct costs
      const updatedPlayer = { ...player }
      if (space.cost) {
        if (space.cost.solari) updatedPlayer.solari -= space.cost.solari
        if (space.cost.spice) updatedPlayer.spice -= space.cost.spice
        if (space.cost.water) updatedPlayer.water -= space.cost.water
      }

      // Add resources
      if (space.resources) {
        if (space.resources.solari) updatedPlayer.solari += space.resources.solari
        if (space.resources.spice) updatedPlayer.spice += space.resources.spice
        if (space.resources.water) updatedPlayer.water += space.resources.water
        if (space.resources.troops) updatedPlayer.troops += space.resources.troops
      }

      // Add influence
      if (space.influence) {
        const currentInfluence = state.factionInfluence[space.influence.faction]?.[playerId] || 0
        state.factionInfluence = {
          ...state.factionInfluence,
          [space.influence.faction]: {
            ...state.factionInfluence[space.influence.faction],
            [playerId]: currentInfluence + space.influence.amount
          }
        }
      }

      // Update occupied spaces
      const updatedOccupiedSpaces = {
        ...state.occupiedSpaces,
        [spaceId]: [...(state.occupiedSpaces[spaceId] || []), playerId]
      }

      // Move card to play area and remove from hand
      const updatedHand = player.hand.filter(c => c.id !== card.id)
      const updatedPlayArea = [...player.playArea, card]

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...updatedPlayer,
                hand: updatedHand,
                playArea: updatedPlayArea,
                agents: p.agents - 1,
                selectedCard: null
              }
            : p
        ),
        occupiedSpaces: updatedOccupiedSpaces,
        lastTurn: {
          playerId,
          type: TurnType.ACTION,
          cardId: card.id,
          agentSpaceTypes: [space.agentIcon],
          canDeployTroops: card.swordIcon || false,
          troopLimit: card.swordIcon ? 2 : 0,
          removableTroops: 0,
          persuasionCount: card.persuasion || 0,
          gainedEffects: [],
          acquiredCards: []
        }
      }
    }
    default:
      return state
  }
}

interface GameProviderProps {
  initialState?: Partial<GameState>
  children: React.ReactNode
}

export const GameProvider: React.FC<GameProviderProps> = ({ initialState = {}, children }) => {
  const [gameState, dispatch] = useReducer(gameReducer, {
    ...initialGameState,
    ...initialState
  })
  
  // Add other state management here

  const value = {
    gameState,
    players: gameState.players,
    currentConflict: gameState.currentConflict,
    imperiumRow: [],
    intrigueDeck: [],
    dispatch
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
} 