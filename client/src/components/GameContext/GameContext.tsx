import React, { createContext, useContext, useReducer } from 'react'
import { 
  GameState, 
  FactionType,
  ConflictCard,
  IntrigueCard,
  Card,
  Reward,
  IntrigueCardEffect,
  Winners as Placements,
  IntrigueCardType,
  TurnType,
  SpaceProps,
  GamePhase,
  CardEffect,
  Player,
  ControlMarkerType,
  RewardType,
  GainSource,
  GainType,
  Gain,
  MakerSpace
} from '../../types/GameTypes'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { ARRAKIS_LIAISON_DECK } from '../../data/cards'
import { SPICE_MUST_FLOW_DECK } from '../../data/cards'
import { FOLDSPACE_DECK } from '../../data/cards'
import { CONFLICTS } from '../../data/conflicts'

interface GameContextType {
  gameState: GameState
  currentConflict: ConflictCard | null
  imperiumRow: Card[]
  intrigueDeck: IntrigueCard[]
  dispatch: React.Dispatch<GameAction>
}

type GameAction = 
  | { type: 'END_TURN'; playerId: number }
  | { type: 'PLAY_CARD'; playerId: number; cardId: number }
  | { type: 'DEPLOY_TROOP'; playerId: number }
  | { type: 'RETREAT_TROOP'; playerId: number }
  | { type: 'PLAY_INTRIGUE'; cardId: number; playerId: number; targetPlayerId?: number }
  | { type: 'ACQUIRE_CARD'; playerId: number; cardId: number }
  | { type: 'PLAY_COMBAT_INTRIGUE'; playerId: number; cardId: number }
  | { type: 'RESOLVE_COMBAT' }
  | { type: 'START_COMBAT_PHASE' }
  | { type: 'PASS_COMBAT'; playerId: number }
  | { type: 'DRAW_INTRIGUE'; playerId: number }
  | { type: 'PLACE_AGENT'; playerId: number; spaceId: number }
  | { type: 'REVEAL_CARDS'; playerId: number; cardIds: number[] }
  | { type: 'ACQUIRE_AL'; playerId: number }
  | { type: 'ACQUIRE_SMF'; playerId: number }
  | { type: 'SELECT_CONFLICT'; conflictId: number }
const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = () => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}

const initialGameState: GameState = {
  firstPlayerMarker: 0,
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
  intrigueDiscard: [],
  conflictsDiscard: [],
  controlMarkers: {
    [ControlMarkerType.ARRAKIN]: null,
    [ControlMarkerType.CARTHAG]: null,
    [ControlMarkerType.IMPERIAL_BASIN]: null
  },
  bonusSpice: {
    [MakerSpace.HAGGA_BASIN]: 0,
    [MakerSpace.GREAT_FLAT]: 0,
    [MakerSpace.IMPERIAL_BASIN]: 0
  },
  combatStrength: {},
  combatTroops: {},
  currentConflict: {
    id: 0,
    tier: 1,
    name: 'Placeholder',
    rewards: {
      first: [],
      second: [],
      third: []
    }
  },
  players: [],
  combatPasses: new Set(),
  history: [],
  occupiedSpaces: {},
  playArea: {} as Record<number, Card[]>,
  canEndTurn: false,
  canAcquireIR: false,
  gains: []
}

function determinePlacements(
  strength: Record<number, number>,
  playerCount: number
): Placements {
  const entries = Object.entries(strength)
    .map(([id, str]) => ({ id: Number(id), strength: str }))
    .filter(entry => entry.strength > 0)
    .sort((a, b) => b.strength - a.strength)
  if(playerCount === 4) {
    return getPlacements4p(entries)
  } else {
    // return getPlacements3p(entries) TODO
    return {
      first: [],
      second: [],
      third: []
    }
  }

}

function getPlacements4p(entries: {id: number, strength: number}[]): Placements {
  const placements: Placements = {
    first: [],
    second: [],
    third: []
  }
  if(entries[0]?.strength === entries[1]?.strength) {
    placements.second = [entries[0]?.id, entries[1]?.id]
    if(entries[1]?.strength === entries[2]?.strength) {
      placements.second.push(entries[2]?.id)
    } else if (entries[2]?.strength !== entries[3]?.strength) {
      //3rd and 4th players not tied - third place is rewarded
      placements.third = [entries[2]?.id]
    }
    if(entries[1]?.strength === entries[3]?.strength) {
      placements.second.push(entries[3]?.id)
    }
  } else {
    placements.first = [entries[0]?.id]
    if(entries[1]?.strength === entries[2]?.strength) {
      placements.third = [entries[1]?.id, entries[2]?.id]
      if(entries[2]?.strength === entries[3]?.strength) {
        placements.third.push(entries[3]?.id)
      }
    } else {
      placements.second = [entries[1]?.id]
      if(entries[2]?.strength !== entries[3]?.strength) {
        //3rd and 4th players not tied - third place is rewarded
        placements.third = [entries[2]?.id]
      }
    }
  }
  return placements
}

function applyReward(state: GameState, reward: Reward, placement: string, playerIds: number[]): GameState {
  const newState = { ...state }
  newState.gains = newState.gains || []
  newState.gains.push({
    playerId: playerIds[0],
    source: GainSource.CONFLICT,
    sourceId: state.currentConflict.id,
    type: reward.type,
    round: state.currentRound,
    name: state.currentConflict.name + ' - ' + placement,
    amount: reward.amount
  })
  switch (reward.type) {
    case RewardType.VICTORY_POINTS:
      newState.players = newState.players.map(player => 
        playerIds.includes(player.id)
          ? { ...player, victoryPoints: player.victoryPoints + reward.amount }
          : player
      )
      break

    case RewardType.INFLUENCE : {
      // TODO player chooses faction
      const faction = FactionType.EMPEROR
      const currentInfluence = state.factionInfluence[faction][playerIds[0]] || 0
      newState.factionInfluence = {
        ...state.factionInfluence,
        [faction]: {
          ...state.factionInfluence[faction],
          [playerIds[0]]: currentInfluence + reward.amount
        }
      }
      break
    }
    case RewardType.CONTROL:
      if (state.currentConflict?.controlSpace) {
        newState.controlMarkers[state.currentConflict.controlSpace] = playerIds[0]
      }
      // newState.gains.controlGains = newState.gains.controlGains || []
      // newState.gains.controlGains.push({
      //   playerId: playerIds[0],
      //   round: state.currentRound,
      //   name: 'Conflict victory', //TODO add conflict name and place
      //   amount: reward.amount
      // })
      break

    case RewardType.SPICE:
      newState.players = newState.players.map(player =>
        playerIds.includes(player.id)
          ? { ...player, spice: player.spice + reward.amount }
          : player
      )
      break

    case RewardType.WATER:
      newState.players = newState.players.map(player =>
        playerIds.includes(player.id)
          ? { ...player, water: player.water + reward.amount }
          : player
      )
      break

    case RewardType.SOLARI:
      newState.players = newState.players.map(player =>
        playerIds.includes(player.id)
          ? { ...player, solari: player.solari + reward.amount }
          : player
      )
      break

    case RewardType.TROOPS:
      newState.players = newState.players.map(player =>
        playerIds.includes(player.id)
          ? { ...player, troops: player.troops + reward.amount }
          : player
      )
      break
    case RewardType.INTRIGUE:
      newState.players = newState.players.map(player =>
        playerIds.includes(player.id)
          ? { ...player, intrigueCount: player.intrigueCount + reward.amount }
          : player
      )
      break
    case RewardType.AGENT:
        //TODO
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
    case 'SELECT_CONFLICT': {
      const conflict = CONFLICTS.find(c => c.id === action.conflictId)
      if (!conflict) return state
      return {
        ...state,
        currentConflict: conflict,
        phase: GamePhase.PLAYER_TURNS
      }
    }
    case 'END_TURN': {
      const { playerId } = action
      if (playerId !== state.activePlayerId) return state

      const newState = {...state}
      const player = newState.players[playerId]
      if (!player) return state
      if (!state.selectedCard && state.currTurn?.type !== TurnType.REVEAL) return state
      const currentTurn = newState.currTurn
      if (!currentTurn) return state

      if(player.revealed) {
        player.discardPile = [...(player.discardPile || []), ...(player.playArea || [])]
        player.playArea = []
        player.persuasion = 0
      }

      if (!newState.players.find(p => !p.revealed)) {
        // All players have revealed
        return {
          ...newState,
          phase: GamePhase.COMBAT,
          combatPasses: new Set(),
          players: newState.players.map(p =>
            p.id === playerId
              ? {
                  ...p,
                  selectedCard: null,
                }
              : p
          ),
          activePlayerId: 0,
          history: [...state.history, state],
          currTurn: null,
          canEndTurn: false,
          canAcquireIR: false,
          selectedCard: null,
          gains: []
        }
      }
      
      let nextIndex = (playerId + 1) % newState.players.length
      let nextPlayer = newState.players[nextIndex]
      while(nextPlayer.revealed) {
        nextIndex = (nextIndex + 1) % newState.players.length
        nextPlayer = newState.players[nextIndex]
      }
      

      return {
        ...newState,
        players: newState.players.map(p =>
          p.id === playerId
            ? {
                ...p,
                selectedCard: null,
              }
            : p
        ),
        activePlayerId: nextPlayer.id,
        history: [...newState.history, newState],
        currTurn: null,
        canEndTurn: false,
        selectedCard: null,
        canAcquireIR: false,
        gains: []
      }
    }
    case 'DEPLOY_TROOP': {
      const player = state.players.find(p => p.id === action.playerId)
      if (!player || player.troops <= 0) return state
      
      const currentTroops = state.combatTroops[action.playerId] || 0
      const updatedCombat = player.combatValue? player.combatValue + 2 : 2;
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
        combatStrength: {
          ...state.combatStrength,
          [action.playerId]: state.combatStrength[action.playerId] ? state.combatStrength[action.playerId] + 2 : 2
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, 
              combatValue: updatedCombat, 
              troops: p.troops - 1 }
            : p
        ),
        currTurn: currentTurn
      }

      return newState
    }
    case 'RETREAT_TROOP': {
      const currentTroops = state.combatTroops[action.playerId] || 0
      if (currentTroops <= 0) return state
      const currentTurn= state.activePlayerId === action.playerId ? 
      {
          ...state.currTurn,
          playerId: state.activePlayerId,
          type: state.currTurn?.type || TurnType.ACTION,
          removableTroops: state.currTurn?.removableTroops ? state.currTurn.removableTroops -1 : 0,
      } : state.currTurn;
      const newCombatStrength = {...state.combatStrength}
      if(newCombatStrength[action.playerId]) {
        const newPlayerCombatStrength = newCombatStrength[action.playerId] - 2
        if(newPlayerCombatStrength <= 0) {
          delete newCombatStrength[action.playerId]
        } else {
          newCombatStrength[action.playerId] = newPlayerCombatStrength
        }
      } else {
        return state;
      }

      const newState = {
        ...state,
        currTurn: currentTurn,
        combatStrength: newCombatStrength,
        combatTroops: {
          ...state.combatTroops,
          [action.playerId]: currentTroops - 1
        },
        players: state.players.map(p =>
          p.id === action.playerId
            ? { ...p, 
              combatValue: p.combatValue ? p.combatValue - 2 : 0, 
              troops: p.troops + 1 }
            : p
        )
      }

      return newState
    }
    case 'START_COMBAT_PHASE': {
      const newState = {...state}
      newState.combatPasses = new Set()
      newState.players.forEach(p => {if(p.intrigueCount<1||newState.combatTroops[p.id] < 1){newState.combatPasses.add(p.id)}})

      if(newState.combatPasses.size === newState.players.length) {
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
      }
      let nextIndex = newState.firstPlayerMarker
      let nextPlayer = newState.players[nextIndex]
      while(nextPlayer.intrigueCount < 1 || newState.combatTroops[nextIndex] < 1) {
        nextIndex = (nextIndex + 1) % newState.players.length
        nextPlayer = newState.players[nextIndex]
      }
      return {
        ...state,
        phase: GamePhase.COMBAT,
        activePlayerId: nextIndex,
      }
    }
    case 'PASS_COMBAT': {
      const { playerId } = action
      const newState = {...state}
      newState.combatPasses.add(playerId)
      const lastPlayerId = (newState.firstPlayerMarker -1) % newState.players.length
      if(newState.combatPasses.size === newState.players.length || 
        newState.players.every(p => (p.intrigueCount < 1 || newState.combatTroops[p.id] < 1))) {
        // everyone passed or noone has intrigue left
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
      } else if(lastPlayerId === playerId) {
        // not everyone passed - continue combat
        newState.combatPasses = new Set()
        newState.players.forEach(p => {if(newState.combatTroops[p.id] < 1){newState.combatPasses.add(p.id)}})
      }

      let nextIndex = (playerId + 1) % newState.players.length
      let nextPlayer = newState.players[nextIndex]
      while(nextPlayer.intrigueCount < 1 || newState.combatTroops[nextIndex] < 1) {
        nextIndex = (nextIndex + 1) % newState.players.length
        nextPlayer = newState.players[nextIndex]
      }
    
      return {
        ...newState
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
      
      const strength = {...state.combatStrength}

      const placements = determinePlacements(strength, state.players.length) as Placements

      let newState = { ...state }

      //TODO handle choices in CombatResults.tsx
      let mentatOwnerNextRound = null;
      if (placements.first !== null && placements.first.length > 0) {
        state.currentConflict.rewards.first.forEach(reward => {
          newState = applyReward(newState, reward, "1st place", placements.first || [])
        })
        if(state.currentConflict.rewards.first.find(r => r.type === RewardType.AGENT)) {
          mentatOwnerNextRound = placements.first[0]
        }
      }

      if (placements.second !== null && placements.second.length > 0) {
        state.currentConflict.rewards.second.forEach(reward => {
          newState = applyReward(newState, reward, "2nd place", placements.second || [])
        })
      }

      if (placements.third !== null && placements.third.length > 0 &&state.players.length === 4) {
        state.currentConflict.rewards.third?.forEach(reward => {
          newState = applyReward(newState, reward, "3rd place", placements.third || [])
        })
      }

      // Apply Makers
      BOARD_SPACES.forEach(s => {
        if(s.makerSpace && newState.occupiedSpaces[s.id]?.length === 0) {
          newState.bonusSpice[s.makerSpace] += 1
        }
      })

      // Recall Agents
      newState.occupiedSpaces = {}
      newState.players.forEach(p => {
        newState.players[p.id].agents = 2
        if(newState.players[p.id].hasSwordmaster) {
          newState.players[p.id].agents += 1
        }
        if(newState.players[p.id].id === mentatOwnerNextRound) {
          newState.mentatOwner = p.id
          newState.players[p.id].agents += 1
        }
      })
      
      // Draw 5 cards
      newState.players.forEach(p => {
        if(p.deck.length < 5) {
          p.deck = [...p.deck, ...p.discardPile]
          p.discardPile = []
        }
        p.handCount = 5
      })
      newState.firstPlayerMarker = (newState.firstPlayerMarker + 1) % newState.players.length

      // TODO If 10+ VP = End Game

      return {
        ...newState,
        phase: GamePhase.ROUND_START,
        combatStrength: {},
        combatTroops: {},
        currentRound: newState.currentRound + 1,
        conflictsDiscard: [...state.conflictsDiscard, state.currentConflict]
      }
    }
    case 'PLAY_INTRIGUE': {
      const { cardId, playerId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = state.intrigueDeck.find(c => c.id === cardId)

      if (!card) return state

      const newState = handleIntrigueEffect(state, card.effect, playerId)

      newState.players = newState.players.map(p =>
        p.id === playerId
          ? {
              ...p,
              intrigueCount: p.intrigueCount - 1
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
      const newState = {...state}
      const updatedPlayer: Player = {...newState.players.find(p => p.id === playerId)} as Player
      const card = updatedPlayer.deck.find(c => c.id === newState.selectedCard)
      const space = BOARD_SPACES.find((s: SpaceProps) => s.id === spaceId)
      
      if (!updatedPlayer || !card || !space || playerId !== newState.activePlayerId || !newState.selectedCard) return state
      
      // Check if player has any agents left
      if (updatedPlayer.agents <= 0) return state

      // Check if player can afford the space
      if (space.cost) {
        if (space.cost.solari && updatedPlayer.solari < space.cost.solari) return state
        if (space.cost.spice && updatedPlayer.spice < space.cost.spice) return state
        if (space.cost.water && updatedPlayer.water < space.cost.water) return state
      }

      // Check if space is already occupied
      if (newState.occupiedSpaces[spaceId]?.length > 0) return state
      
      if(space.controlMarker) {
        const controlPlayerId = newState.controlMarkers[space.controlMarker]
        if(controlPlayerId) {
          if(space.controlBonus?.solari) {
            newState.players[controlPlayerId].solari += space.controlBonus.solari
            newState.gains.push({ round: newState.currentRound, playerId: controlPlayerId, sourceId: space.id, name: space.name + " Control Bonus", amount: space.controlBonus.solari, type: RewardType.SOLARI, source: GainSource.CONTROL } )
          }
          if(space.controlBonus?.spice) {
            newState.players[controlPlayerId].spice += space.controlBonus.spice
            newState.gains.push({ round: newState.currentRound, playerId: controlPlayerId, sourceId: space.id, name: space.name + " Control Bonus", amount: space.controlBonus.spice, type: RewardType.SPICE, source: GainSource.CONTROL } )
          }
        }
      }

      // Check if player has required influence
      if (space.requiresInfluence) {
        const playerInfluence = newState.factionInfluence[space.requiresInfluence.faction as FactionType]?.[playerId] || 0
        if (playerInfluence < space.requiresInfluence.amount) return state
      }

      // Deduct costs
      if (space.cost) {
        if (space.cost.solari) updatedPlayer.solari -= space.cost.solari
        if (space.cost.spice) updatedPlayer.spice -= space.cost.spice
        if (space.cost.water) updatedPlayer.water -= space.cost.water
      }
      const updatedGains: Gain[] = [...newState.gains]

      
      if (space.reward) {
        if (space.reward.solari) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: space.reward.solari, type: RewardType.SOLARI, source: GainSource.CONTROL } )
          updatedPlayer.solari += space.reward.solari
        } 
        if (space.reward.spice) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: space.reward.spice, type: RewardType.SPICE, source: GainSource.CONTROL } )
          updatedPlayer.spice += space.reward.spice
          if(space.makerSpace) {
            updatedPlayer.spice += newState.bonusSpice[space.makerSpace] 
            newState.bonusSpice[space.makerSpace] = 0
          }
        }
        if (space.reward.water) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: space.reward.water, type: RewardType.WATER, source: GainSource.CONTROL } )
          updatedPlayer.water += space.reward.water
        }
        if (space.reward.troops) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: space.reward.troops, type: RewardType.TROOPS, source: GainSource.CONTROL } )
          updatedPlayer.troops += space.reward.troops
        }
        if (space.reward.persuasion) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: space.reward.persuasion, type: RewardType.PERSUASION, source: GainSource.CONTROL } )
          updatedPlayer.persuasion += space.reward.persuasion
        }
      }
      if(card.playEffect) {
        card.playEffect?.filter((effect:CardEffect) => {
            if(effect.cost) {
              return false;
            }
            return requirementSatisfied(effect, state, playerId);
           }).forEach(effect => {
          if(effect.reward) {
              if(effect.reward.spice) {
                updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.spice, type: RewardType.SPICE, source: GainSource.CARD } )
                updatedPlayer.spice += effect.reward.spice
              }
              if(effect.reward.water) {
                updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.water, type: RewardType.WATER, source: GainSource.CARD } )
                updatedPlayer.water += effect.reward.water
              }
              if(effect.reward.solari) {
                updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.solari, type: RewardType.SOLARI, source: GainSource.CARD } )
                updatedPlayer.solari += effect.reward.solari
              }
              if(effect.reward.troops) {
                updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.troops, type: RewardType.TROOPS, source: GainSource.CARD } )
                updatedPlayer.troops += effect.reward.troops
              }
            }
        })
      }
      
      // TODO implement card draw
      
      // Add influence
      if (space.influence) {
        const currentInfluence = newState.factionInfluence[space.influence.faction as FactionType]?.[playerId] || 0
        newState.factionInfluence = {
          ...newState.factionInfluence,
          [space.influence.faction as FactionType]: {
            ...newState.factionInfluence[space.influence.faction as FactionType],
            [playerId]: currentInfluence + space.influence.amount
          }
        }
      }

      // Update occupied spaces
      const updatedOccupiedSpaces = {
        ...newState.occupiedSpaces,
        [spaceId]: [...(newState.occupiedSpaces[spaceId] || []), playerId]
      }

      const updatedDeck = updatedPlayer.deck.filter(c => c.id !== card.id)
      const updatedPlayArea = [...updatedPlayer.playArea, card]

      const canDeployTroops = space.conflictMarker || false
      const troopLimit = canDeployTroops ? 2 + (space.reward?.troops || 0): 0
      const persuasionCount = space.reward?.persuasion || 0

      const currentTurn = newState.currTurn?.playerId === playerId 
        ? {
            ...newState.currTurn,
            agentSpace: space.agentIcon,
            canDeployTroops: canDeployTroops,
            troopLimit: troopLimit,
            removableTroops: newState.currTurn?.removableTroops || 0,
            persuasionCount: (newState.currTurn?.persuasionCount || 0) + persuasionCount
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
            newState.mentatOwner = playerId
            updatedPlayer.agents += 1
            break

          case 'swordmaster':
            updatedPlayer.hasSwordmaster = true
            updatedPlayer.agents += 1
            break

          case 'foldspace': {
            const card = newState.foldspaceDeck.pop()
            if (card) {
              updatedPlayer.discardPile.push(card)
            }
            break
          }

          case 'secrets':
            newState.players.forEach(opponent => {
              if (opponent.id !== playerId && opponent.intrigueCount >= 4) {
                opponent.intrigueCount -= 1
                updatedPlayer.intrigueCount += 1
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
        ...newState,
        gains: updatedGains,
        players: newState.players.map(p =>
          p.id === playerId
            ? {
                ...updatedPlayer,
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
      const player: Player = {...state.players.find(p => p.id === playerId)} as Player
      
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

      const updatedGains: Gain[] = [...state.gains]

      if(player.hasHighCouncilSeat) {
        updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: 0, name: "High Council Seat", amount: 2, type: RewardType.PERSUASION, source: GainSource.HIGH_COUNCIL } )
        persuasionCount += 2
      }

      revealedCards.forEach(card => {
        card.revealEffect?.filter((effect:CardEffect) => {
            if(effect.cost) {
              return false;
            }
            return requirementSatisfied(effect, state, playerId);
          })
          .forEach(effect => {
            if(effect.reward?.persuasion) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.persuasion, type: RewardType.PERSUASION, source: GainSource.CARD } )
              persuasionCount += effect.reward.persuasion
            }
            if(effect.reward?.combat) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.combat, type: RewardType.COMBAT, source: GainSource.CARD } )
              swordCount += effect.reward.combat
            }
            if(effect.reward?.spice) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.spice, type: RewardType.SPICE, source: GainSource.CARD } )
              spiceCount += effect.reward.spice
            }
            if(effect.reward?.water) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.water, type: RewardType.WATER, source: GainSource.CARD } )
              waterCount += effect.reward.water
            }
            if(effect.reward?.solari) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.solari, type: RewardType.SOLARI, source: GainSource.CARD } )
              solariCount += effect.reward.solari
            }
          })
      })

      // Update combat strength if player has troops in combat
      const hasTroopsInCombat = (state.combatTroops[playerId] || 0) > 0
      const updatedCombatValue = hasTroopsInCombat ? 
            (player.combatValue ? player.combatValue + swordCount : swordCount + (state.combatTroops[playerId] * 2)) 
          : player.combatValue
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
        gains: updatedGains,
        players: state.players.map(p =>
          p.id === playerId
            ? {
                ...player,
                deck: updatedDeck,
                playArea: updatedPlayArea,
                selectedCard: null,
                combatValue: updatedCombatValue,
                handCount: 0,
                persuasion: player.persuasion + persuasionCount,
                spice: player.spice + spiceCount,
                water: player.water + waterCount,
                solari: player.solari + solariCount,
                revealed: true
              }
            : p
        ),
        combatStrength: updatedCombatStrength,
        currTurn: currentTurn,
        canEndTurn: true,
        canAcquireIR: true
      }
    }
    case 'ACQUIRE_AL': {
      const { playerId } = action
      const player: Player = {...state.players.find(p => p.id === playerId)} as Player
      if (!player) return state
      if (state.arrakisLiaisonDeck.length === 0) return state
      if (player.persuasion < 2) return state
      const alDeck = [...state.arrakisLiaisonDeck]
      player.discardPile.push(alDeck.pop() as Card)
      player.persuasion -= 2
      return {
        ...state,
        arrakisLiaisonDeck: alDeck,
        players: state.players.map(p => p.id === playerId ? { ...p, discardPile: player.discardPile, persuasion: player.persuasion } : p)
      }
    }
    case 'ACQUIRE_SMF': {
      const { playerId } = action
      const player: Player = {...state.players.find(p => p.id === playerId)} as Player
      if (!player) return state
      if (state.spiceMustFlowDeck.length === 0) return state
      if (player.persuasion < 9) return state
      const smfDeck = [...state.spiceMustFlowDeck]
      const card = smfDeck.pop() as Card
      const updatedGains: Gain[] = [...state.gains]
      if(card.acquireEffect?.victoryPoints) {
        updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name + " Acquire Effect", amount: card.acquireEffect.victoryPoints, type: RewardType.VICTORY_POINTS, source: GainSource.CARD } )
        player.victoryPoints += card.acquireEffect?.victoryPoints || 0
      }
      player.discardPile.push(card)
      player.persuasion -= 9
      return {
        ...state,
        spiceMustFlowDeck: smfDeck,
        gains: updatedGains,
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