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
  IntrigueCardEffect
} from '../types/GameTypes'

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
  combatCardId: null,
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
  combatPasses: [],
  firstPlayer: 1
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
  let newState = { ...state }
  
  switch (reward.type) {
    case 'victory-points':
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
    case 'water':
    case 'solari':
      newState.players = newState.players.map(player =>
        player.id === playerId
          ? { ...player, [reward.type]: player[reward.type] + reward.amount }
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
  playerId: number,
  targetPlayerId?: number
): GameState {
  let newState = { ...state }

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

      if (!card || card.type !== CardType.COMBAT) return state

      // Reset passes when someone plays a card
      let newState = {
        ...state,
        combatPasses: []
      }

      // Apply card effect
      const effect = JSON.parse(card.effect) as CombatIntrigueEffect
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

      const winners = determineWinners(strength, state.players.length)

      // Apply rewards
      let newState = { ...state }

      if (winners.first) {
        state.currentConflict.rewards.first.forEach(reward => {
          newState = applyReward(newState, reward, winners.first)
        })
      }

      if (winners.second) {
        state.currentConflict.rewards.second.forEach(reward => {
          newState = applyReward(newState, reward, winners.second)
        })
      }

      if (winners.third && state.players.length === 4) {
        state.currentConflict.rewards.third?.forEach(reward => {
          newState = applyReward(newState, reward, winners.third)
        })
      }

      // Reset combat state
      return {
        ...newState,
        phase: GamePhase.MAKERS,
        combatStrength: {},
        combatTroops: {},
        currentConflict: null
      }
    }
    case 'PLAY_INTRIGUE': {
      const { cardId, playerId, targetPlayerId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = player?.intrigueCards.find(c => c.id === cardId)

      if (!card) return state

      // Apply effect
      let newState = handleIntrigueEffect(state, card.effect, playerId, targetPlayerId)

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
    // Add other cases
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
    players: [], // Initialize with players
    currentConflict: null,
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