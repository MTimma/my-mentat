import React, { createContext, useContext, useReducer } from 'react'
import { 
  GameState, 
  FactionType,
  ConflictCard,
  IntrigueCard,
  Card,
  Reward,
  IntrigueCardEffect,
  Winners,
  IntrigueCardType,
  TurnType,
  SpaceProps,
  GamePhase,
  CardEffect,
  SpaceGain,
  CardGain,
  FieldGain,
  IntrigueGain,
  ConflictGain
} from '../types/GameTypes'
import { boardSpaces } from '../data/boardSpaces'
import { ARRAKIS_LIAISON_DECK } from '../data/cards'
import { SPICE_MUST_FLOW_DECK } from '../data/cards'
import { FOLDSPACE_DECK } from '../data/cards'
interface GameContextType {
  gameState: GameState
  currentConflict: ConflictCard | null
  imperiumRow: Card[]
  intrigueDeck: IntrigueCard[]
  dispatch: React.Dispatch<GameAction>
}

type GameAction = 
  | { type: 'START_ROUND' }
  | { type: 'END_TURN'; playerId: number }
  | { type: 'PLAY_CARD'; playerId: number; cardId: number }
  | { type: 'ADD_TROOP'; playerId: number }
  | { type: 'REMOVE_TROOP'; playerId: number }
  | { type: 'PLAY_INTRIGUE'; cardId: number; playerId: number; targetPlayerId?: number }
  // | { type: 'GAIN_INFLUENCE'; playerId: number; faction: FactionType; amount: number }
  | { type: 'ACQUIRE_CARD'; playerId: number; cardId: number }
  // | { type: 'DRAW_CARD'; playerId: number }
  // | { type: 'GAIN_RESOURCE'; playerId: number; resource: 'spice' | 'water' | 'solari'; amount: number }
  // | { type: 'START_COMBAT' }
  // | { type: 'ADD_COMBAT_STRENGTH'; playerId: number; amount: number }
  | { type: 'PLAY_COMBAT_INTRIGUE'; playerId: number; cardId: number }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'START_COMBAT_PHASE' }
  | { type: 'PASS_COMBAT'; playerId: number }
  | { type: 'DRAW_INTRIGUE'; playerId: number }
  | { type: 'PLACE_AGENT'; playerId: number; spaceId: number }
  | { type: 'REVEAL_CARDS'; playerId: number; cardIds: number[] }
  | { type: 'ACQUIRE_AL'; playerId: number }
  | { type: 'ACQUIRE_SMF'; playerId: number }
const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

const initialGameState: GameState = {
  startingPlayerId: 0,
  selectedCard: null,
  currentRound: 1,
  activePlayerId: 0,
  phase: GamePhase.ROUND_START,
  currTurn: null,
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
  spiceMustFlowDeck: SPICE_MUST_FLOW_DECK,
  arrakisLiaisonDeck: ARRAKIS_LIAISON_DECK,
  foldspaceDeck: FOLDSPACE_DECK,
  imperiumRowDeck: [],
  imperiumRow: [],
  intrigueDeck: [],
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
  playArea: {} as Record<number, Card[]>,
  canEndTurn: false,
  canAcquireIR: false
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

function requirementSatisfied(effect: CardEffect, state: GameState, playerId: number): boolean {
  if(effect?.requirement) {
    const req = effect.requirement
    if(req.influence) {
      const factionType = req.influence.faction;
      const factionAmount = req.influence.amount;
      if(state.factionInfluence[factionType]?.[playerId] < factionAmount) {
        return false;
      }
    }
    if(req.alliance) {
      if(state.factionAlliances[req.alliance] !== playerId) {
        return false;
      }
    }
    if(req.bond) {
      if(!state.playArea[playerId].find(card => card.faction === req.bond)) {
        return false;
      }
    }
  }
  return true;
}

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
      if (!state.selectedCard && state.currTurn?.type !== TurnType.REVEAL) return state
      const currentTurn = state.currTurn
      if (!currentTurn) return state
      if (!state.players.find(p => !p.revealed)) {
        // All players have revealed
        return {
          ...state,
          phase: GamePhase.COMBAT,
          combatPasses: [],
          players: state.players.map(p =>
            p.id === playerId
              ? {
                  ...p,
                  selectedCard: null,
                  discardPile: [...p.discardPile, ...p.playArea]
                }
              : p
          ),
          activePlayerId: 0,
          turns: [...state.turns, currentTurn],
          currTurn: null,
          canEndTurn: false,
          canAcquireIR: false,
          selectedCard: null
        }
      }
      
      let nextIndex = (playerId + 1) % state.players.length
      let nextPlayer = state.players[nextIndex]
      while(nextPlayer.revealed) {
        nextIndex = (nextIndex + 1) % state.players.length
        nextPlayer = state.players[nextIndex]
      }

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...p,
                selectedCard: null,
                discardPile: [...p.discardPile, ...p.playArea]
              }
            : p
        ),
        activePlayerId: nextPlayer.id,
        turns: [...state.turns, currentTurn],
        currTurn: null,
        canEndTurn: false,
        selectedCard: null,
        canAcquireIR: false
      }
    }
    case 'ADD_TROOP': {
      const player = state.players.find(p => p.id === action.playerId)
      if (!player || player.troops <= 0) return state
      
      const currentTroops = state.combatTroops[action.playerId] || 0

      const currentTurn = state.activePlayerId === action.playerId ? 
        {
            ...state.currTurn,
            playerId: state.activePlayerId,
            type: state.currTurn?.type || TurnType.ACTION,
            removableTroops: state.currTurn?.removableTroops ? state.currTurn.removableTroops + 1 : 1,
        } : state.currTurn;
      if (!currentTurn) return state
      
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
        ),
        currTurn: currentTurn
      }

      return newState
    }
    case 'REMOVE_TROOP': {
      const currentTroops = state.combatTroops[action.playerId] || 0
      if (currentTroops <= 0) return state
      const currentTurn= state.activePlayerId === action.playerId ? 
      {
          ...state.currTurn,
          playerId: state.activePlayerId,
          type: state.currTurn?.type || TurnType.ACTION,
          removableTroops: state.currTurn?.removableTroops ? state.currTurn.removableTroops -1 : 0,
      } : state.currTurn;
      const newState = {
        ...state,
        currTurn: currentTurn,
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
    case 'START_COMBAT_PHASE': {
      state.players.forEach(p => {if(p.intrigueCount<1){state.combatPasses.push(p.id)}})
      const nextActive = state.players.find(p => !state.combatPasses.find(id => id === p.id))
      if(!nextActive) {
        return {
          ...state,
          phase: GamePhase.COMBAT_REWARDS
        }
      }
      return {
        ...state,
        phase: GamePhase.COMBAT,
        activePlayerId: nextActive.id,
      }
    }
    case 'PASS_COMBAT': {
      return {
        ...state,
        combatPasses: [...state.combatPasses, action.playerId]
      }
    }
    case 'PLAY_COMBAT_INTRIGUE': {
      const { playerId, cardId } = action
      const card = state.intrigueDeck.find(c => c.id === cardId)

      if (!card || card.type !== IntrigueCardType.COMBAT) return state

      const newState = {...state}
      const effect = card.effect
      // TODO check effect requirements and timing
      if (effect.strengthBonus) {
        newState.combatStrength[playerId] = 
          (newState.combatStrength[playerId] || 0) + effect.strengthBonus
      }

      newState.players = newState.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              intrigueCount: p.intrigueCount - 1
            }
          : p
      )
      newState.intrigueDeck = newState.intrigueDeck.filter(c => c.id !== cardId)
      newState.intrigueDiscard.push(card)

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
      const card = player?.deck.find(c => c.id === cardId)

      if (!card || playerId !== state.activePlayerId || !player) return state
      // Create or update the current turn
      const currentTurn = state.currTurn?.playerId === playerId 
        ? { ...state.currTurn }
        : {
            playerId,
            type: TurnType.ACTION,
            cardId,
            agentSpace: undefined,
            canDeployTroops: false,
            troopLimit: 2,
            removableTroops: 0,
            persuasionCount: 0,
            gainedEffects: [],
            acquiredCards: []
          }

      return {
        ...state,
        selectedCard: cardId,
        currTurn: currentTurn
      }
    }
    case 'PLACE_AGENT': {
      const { playerId, spaceId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = player?.deck.find(c => c.id === state.selectedCard)
      const space = boardSpaces.find((s: SpaceProps) => s.id === spaceId)

      if (!player || !card || !space || playerId !== state.activePlayerId || !state.selectedCard) return state

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
        const playerInfluence = state.factionInfluence[space.requiresInfluence.faction as FactionType]?.[playerId] || 0
        if (playerInfluence < space.requiresInfluence.amount) return state
      }

      // Deduct costs
      const updatedPlayer = { ...player }
      if (space.cost) {
        if (space.cost.solari) updatedPlayer.solari -= space.cost.solari
        if (space.cost.spice) updatedPlayer.spice -= space.cost.spice
        if (space.cost.water) updatedPlayer.water -= space.cost.water
      }

      if (space.reward) {
        if (space.reward.solari) {
          if(!state.gains.solariGains) {
            state.gains.solariGains = []
          }
          state.gains.solariGains.push({ spaceId: space.id, name: space.name, amount: space.reward.solari } as SpaceGain)
          updatedPlayer.solari += space.reward.solari
        } 
        if (space.reward.spice) {
          if(!state.gains.spiceGains) {
            state.gains.spiceGains = []
          }
          state.gains.spiceGains.push({ spaceId: space.id, name: space.name, amount: space.reward.spice } as SpaceGain)
          updatedPlayer.spice += space.reward.spice
        }
        if (space.reward.water) {
          if(!state.gains.waterGains) {
            state.gains.waterGains = []
          }
          state.gains.waterGains.push({ spaceId: space.id, name: space.name, amount: space.reward.water } as SpaceGain)
          updatedPlayer.water += space.reward.water
        }
        if (space.reward.troops) {
          if(!state.gains.troopsGains) {
            state.gains.troopsGains = []
          }
          state.gains.troopsGains.push({ spaceId: space.id, name: space.name, amount: space.reward.troops } as SpaceGain)
          updatedPlayer.troops += space.reward.troops
        }
        if (space.reward.persuasion) {
          if(!state.gains.persuasionGains) {
            state.gains.persuasionGains = []
          }
          state.gains.persuasionGains.push({ spaceId: space.id, name: space.name, amount: space.reward.persuasion } as SpaceGain)
          updatedPlayer.persuasion += space.reward.persuasion
        }
      }
      if(state.selectedCard) {
        const card = player.playArea.find(c => c.id === state.selectedCard)
        if(!card) return state
        card.playEffect?.filter((effect:CardEffect) => {
            if(effect.cost) {
              return false;
            }
            return requirementSatisfied(effect, state, playerId);
           }).forEach(effect => {
          if(effect.gain) {
              if(effect.gain.spice) {
                if(!state.gains.spiceGains) {
                  state.gains.spiceGains = []
                }
                state.gains.spiceGains.push({ cardId: card.id, name: card.name, amount: effect.gain.spice } as CardGain)
                updatedPlayer.spice += effect.gain.spice
              }
              if(effect.gain.water) {
                if(!state.gains.waterGains) {
                  state.gains.waterGains = []
                }
                state.gains.waterGains.push({ cardId: card.id, name: card.name, amount: effect.gain.water } as CardGain)
                updatedPlayer.water += effect.gain.water
              }
              if(effect.gain.solari) {
                if(!state.gains.solariGains) {
                  state.gains.solariGains = []
                }
                state.gains.solariGains.push({ cardId: card.id, name: card.name, amount: effect.gain.solari } as CardGain)
                updatedPlayer.solari += effect.gain.solari
              }
              if(effect.gain.troops) {
                if(!state.gains.troopsGains) {
                  state.gains.troopsGains = []
                }
                state.gains.troopsGains.push({ cardId: card.id, name: card.name, amount: effect.gain.troops } as CardGain)
                updatedPlayer.troops += effect.gain.troops
              }
            }
        })
      }
      

      // TODO implement card draw
      
      // Add influence
      if (space.influence) {
        const currentInfluence = state.factionInfluence[space.influence.faction as FactionType]?.[playerId] || 0
        state.factionInfluence = {
          ...state.factionInfluence,
          [space.influence.faction as FactionType]: {
            ...state.factionInfluence[space.influence.faction as FactionType],
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
      const updatedDeck = player.deck.filter(c => c.id !== card.id)
      const updatedPlayArea = [...player.playArea, card]

      const canDeployTroops = space.conflictMarker || false
      const troopLimit = canDeployTroops ? 2 + (space.reward?.troops || 0): 0
      const persuasionCount = space.reward?.persuasion || 0

      const currentTurn = state.currTurn?.playerId === playerId 
        ? {
            ...state.currTurn,
            agentSpace: space.agentIcon,
            canDeployTroops: canDeployTroops,
            troopLimit: troopLimit,
            removableTroops: state.currTurn?.removableTroops || 0,
            persuasionCount: (state.currTurn?.persuasionCount || 0) + persuasionCount
          }
        : {
            playerId,
            type: TurnType.ACTION,
            cardId: card.id,
            agentSpace: space.agentIcon,
            canDeployTroops: canDeployTroops,
            troopLimit: troopLimit,
            removableTroops: 0,
            persuasionCount: persuasionCount,
            gainedEffects: [],
            acquiredCards: []
          }

      if (space.specialEffect) {
        currentTurn.gainedEffects = [...(currentTurn.gainedEffects || []), space.specialEffect]
        switch (space.specialEffect) {
          case 'mentat':
            state.mentatOwner = playerId
            updatedPlayer.agents += 1
            break

          case 'swordmaster':
            updatedPlayer.hasSwordmaster = true
            updatedPlayer.agents += 1
            break

          case 'foldspace': {
            const card = state.foldspaceDeck.pop()
            if (card) {
              updatedPlayer.discardPile.push(card)
            }
            break
          }

          case 'secrets':
            state.players.forEach(opponent => {
              if (opponent.id !== playerId && opponent.intrigueCards.length >= 4) {
                // TODO: Implement random Intrigue card selection and transfer
              }
            })
            break

          case 'selectiveBreeding':
            // TODO: Implement card trashing and drawing
            break

          case 'sellMelange':
            if (space.cost?.spice) {
              const solariGain = (space.cost.spice * 2) + 2
              updatedPlayer.solari += solariGain
            }
            break
        }
      }

      updatedPlayer.agents -= 1
      updatedPlayer.handCount -= 1

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...updatedPlayer,
                hand: updatedHand,
                deck: updatedDeck,
                playArea: updatedPlayArea,
                selectedCard: null
              }
            : p
        ),
        occupiedSpaces: updatedOccupiedSpaces,
        currTurn: currentTurn,
        canEndTurn: true
      }
    }
    case 'REVEAL_CARDS': {
      const { playerId, cardIds } = action
      const player = state.players.find(p => p.id === playerId)
      
      if (!player || playerId !== state.activePlayerId) return state

      // Move selected cards to play area
      const revealedCards = cardIds
        .map(id => player.deck.find(card => card.id === id))
        .filter((card): card is Card => card !== undefined)

      const updatedDeck = player.deck.filter(card => !cardIds.includes(card.id))
      const updatedPlayArea = [...player.playArea, ...revealedCards]

      // Calculate reveal effects
      let persuasionCount = 0
      let swordCount = 0
      let spiceCount = 0
      let waterCount = 0
      let solariCount = 0

      revealedCards.forEach(card => {
        card.revealEffect?.filter((effect:CardEffect) => {
            if(effect.cost) {
              return false;
            }
            return requirementSatisfied(effect, state, playerId);
          })
          .forEach(effect => {
            if(effect.gain?.persuasion) {
              if(!state.gains.persuasionGains) {
                state.gains.persuasionGains = []
              }
              state.gains.persuasionGains.push({ cardId: card.id, name: card.name, amount: effect.gain.persuasion } as CardGain)
              persuasionCount += effect.gain.persuasion
            }
            if(effect.gain?.combat) {
              if(!state.gains.combatGains) {
                state.gains.combatGains = []
              }
              state.gains.combatGains.push({ cardId: card.id, name: card.name, amount: effect.gain.combat } as CardGain)
              swordCount += effect.gain.combat
            }
            if(effect.gain?.spice) {
              if(!state.gains.spiceGains) {
                state.gains.spiceGains = []
              }
              state.gains.spiceGains.push({ cardId: card.id, name: card.name, amount: effect.gain.spice } as CardGain)
              spiceCount += effect.gain.spice
            }
            if(effect.gain?.water) {
              if(!state.gains.waterGains) {
                state.gains.waterGains = []
              }
              state.gains.waterGains.push({ cardId: card.id, name: card.name, amount: effect.gain.water } as CardGain)
              waterCount += effect.gain.water
            }
            if(effect.gain?.solari) {
              if(!state.gains.solariGains) {
                state.gains.solariGains = []
              }
              state.gains.solariGains.push({ cardId: card.id, name: card.name, amount: effect.gain.solari } as CardGain)
              solariCount += effect.gain.solari
            }
          })
      })

      // Update combat strength if player has troops in combat
      const hasTroopsInCombat = (state.combatTroops[playerId] || 0) > 0
      const updatedCombatStrength = hasTroopsInCombat
        ? { ...state.combatStrength, [playerId]: (state.combatStrength[playerId] || 0) + swordCount }
        : state.combatStrength

      // Create or update the current turn
      const currentTurn = state.currTurn?.playerId === playerId 
        ? {
            ...state.currTurn,
            type: TurnType.REVEAL,
            cardId: undefined,
            agentSpace: undefined,
            canDeployTroops: state.currTurn?.canDeployTroops || false,
            troopLimit: state.currTurn?.troopLimit || 2,
            removableTroops: state.currTurn?.removableTroops || 0,
            persuasionCount: (state.currTurn?.persuasionCount || 0) + persuasionCount,
          }
        : {
            playerId,
            type: TurnType.REVEAL,
            cardId: undefined,
            agentSpace: undefined,
            canDeployTroops: undefined,
            troopLimit: 2,
            removableTroops: 0,
            persuasionCount: persuasionCount,
            gainedEffects: [],
            acquiredCards: []
          }

      return {
        ...state,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...p,
                deck: updatedDeck,
                playArea: updatedPlayArea,
                selectedCard: null,
                handCount: 0,
                persuasion: p.persuasion + persuasionCount,
                spice: p.spice + spiceCount,
                water: p.water + waterCount,
                solari: p.solari + solariCount,
                revealed: true
              }
            : p
        ),
        combatStrength: updatedCombatStrength,
        currTurn: currentTurn,
        canEndTurn: true
      }
    }
    case 'ACQUIRE_AL': {
      const { playerId } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      if (state.arrakisLiaisonDeck.length === 0) return state
      if (player.persuasion < 2) return state
      player.discardPile.push(state.arrakisLiaisonDeck.pop() as Card)
      player.persuasion -= 2
      return {
        ...state,
        players: state.players.map(p => p.id === playerId ? { ...p, discardPile: player.discardPile, persuasion: player.persuasion } : p)
      }
    }
    case 'ACQUIRE_SMF': {
      const { playerId } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      if (state.spiceMustFlowDeck.length === 0) return state
      if (player.persuasion < 9) return state
      const card = state.spiceMustFlowDeck.pop() as Card
      if(card.acquireEffect?.victoryPoints) {
        if(!state.gains.victoryPointsGains) {
          state.gains.victoryPointsGains = []
        }
        state.gains.victoryPointsGains.push({ cardId: card.id, name: card.name, amount: card.acquireEffect.victoryPoints } as CardGain)
        player.victoryPoints += card.acquireEffect?.victoryPoints || 0
      }
      player.discardPile.push(card)
      player.persuasion -= 9
      return {
        ...state,
        players: state.players.map(p => p.id === playerId ? { ...p,discardPile: player.discardPile, persuasion: player.persuasion } : p)
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

  const value = {
    gameState,
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