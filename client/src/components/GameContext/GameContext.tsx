import React, { createContext, useContext, useReducer } from 'react'
import { 
  GameState, 
  FactionType,
  ConflictCard,
  IntrigueCard,
  Card,
  Cost,
  Reward,
  ConflictReward,
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
  Gain,
  MakerSpace,
  PlayEffect,
  RevealEffect,
  GameTurn,
  OptionalEffect,
  PendingChoice,
  CardSelectChoice,
  FixedOptionsChoice,
  CustomEffect,
  ChoiceType,
  CardPile
} from '../../types/GameTypes'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { ARRAKIS_LIAISON_DECK, IMPERIUM_ROW_DECK } from '../../data/cards'
import { SPICE_MUST_FLOW_DECK } from '../../data/cards'
import { FOLDSPACE_DECK } from '../../data/cards'
import { CONFLICTS } from '../../data/conflicts'
import { EFFECT_TEXTS } from '../../data/effectTexts'

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
  | { type: 'PLACE_AGENT'; playerId: number; spaceId: number; sellMelangeData?: { spiceCost: number; solariReward: number }; selectiveBreedingData?: { trashedCardId: number } }
  | { type: 'REVEAL_CARDS'; playerId: number; cardIds: number[] }
  | { type: 'ACQUIRE_AL'; playerId: number }
  | { type: 'ACQUIRE_SMF'; playerId: number }
  | { type: 'PAY_COST'; playerId: number; effect: OptionalEffect }
  | { type: 'RESOLVE_CHOICE'; playerId: number; choiceId: string; reward: Reward; source?: { type: string; id: number; name: string } }
  | { type: 'RESOLVE_CARD_SELECT'; playerId: number; choiceId: string; cardIds: number[] }
  | { type: 'CUSTOM_EFFECT'; playerId: number; customEffect: CustomEffect; data: any }
  | { type: 'TRASH_CARD'; playerId: number; cardId: number; gainReward?: Reward }
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
  imperiumRowDeck: IMPERIUM_ROW_DECK,
  imperiumRow: [IMPERIUM_ROW_DECK[1], IMPERIUM_ROW_DECK[2], IMPERIUM_ROW_DECK[47], IMPERIUM_ROW_DECK[38]],
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

function applyReward(state: GameState, reward: ConflictReward, placement: string, playerIds: number[]): GameState {
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

function applyChoiceReward(state: GameState, reward: Reward, playerId: number): GameState {
  const newState = { 
    ...state,
    gains: [...state.gains], // Create a copy of the gains array too
    combatStrength: { ...state.combatStrength } // Create a copy of combatStrength too
  }
  const originalPlayer = newState.players.find(p => p.id === playerId)
  if (!originalPlayer) return state

  // Create a proper copy of the player object to avoid mutations
  const player = { ...originalPlayer }

  const pushGain = (amount: number | undefined, type: RewardType) => {
    if (!amount) return
    newState.gains.push({
      playerId,
      round: newState.currentRound,
      source: GainSource.CARD,
      sourceId: 0,
      name: 'Choice Reward',
      amount,
      type
    })
  }

  if (reward.spice) { player.spice += reward.spice; pushGain(reward.spice, RewardType.SPICE) }
  if (reward.water) { player.water += reward.water; pushGain(reward.water, RewardType.WATER) }
  if (reward.solari) { player.solari += reward.solari; pushGain(reward.solari, RewardType.SOLARI) }
  if (reward.troops) { player.troops += reward.troops; pushGain(reward.troops, RewardType.TROOPS) }
  if (reward.persuasion) { player.persuasion += reward.persuasion; pushGain(reward.persuasion, RewardType.PERSUASION) }
  if (reward.combat) {
    const current = newState.combatStrength[playerId] || 0
    newState.combatStrength[playerId] = current + reward.combat
    pushGain(reward.combat, RewardType.COMBAT)
  }
  if (reward.drawCards) { player.handCount += reward.drawCards; pushGain(reward.drawCards, RewardType.DRAW) }
  if (reward.deployTroops) {
    const ct = newState.currTurn
    if (ct) {
      ct.troopLimit = (ct.troopLimit || 0) + reward.deployTroops
      ct.canDeployTroops = true
    }
    pushGain(reward.deployTroops, RewardType.DEPLOY)
  }
  if (reward.victoryPoints) { player.victoryPoints += reward.victoryPoints; pushGain(reward.victoryPoints, RewardType.VICTORY_POINTS)}

  newState.players = newState.players.map(p => p.id === playerId ? player : p)
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

function playRequirementSatisfied(effect: PlayEffect, currCard: Card, state: GameState, playerId: number): boolean {
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
    if(req.inPlay) {
      if(!state.playArea[playerId].find(card => currCard.id !== card.id && card.faction?.includes(req.inPlay as FactionType))) {
        return false;
      }
    }
  }
  return true;
}

function revealRequirementSatisfied(effect: RevealEffect, currCard: Card, state: GameState, playerId: number, revealedCards: Card[]): boolean {
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
      if(
        !state.playArea[playerId].find(card => currCard.id !== card.id && card.faction?.includes(FactionType.FREMEN)) &&
        !revealedCards.find(card => currCard.id !== card.id && card.faction?.includes(FactionType.FREMEN))
      ) {
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
        phase: GamePhase.PLAYER_TURNS,
        activePlayerId: state.firstPlayerMarker
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
        // All players have revealed - check if anyone can participate in combat
        const playersWithTroops = newState.players.filter(p => (newState.combatTroops[p.id] || 0) > 0)
        const playersWithIntrigueAndTroops = playersWithTroops.filter(p => p.intrigueCount > 0)
        
        if (playersWithIntrigueAndTroops.length === 0) {
          // Skip combat phase - no one can participate
          return {
            ...newState,
            phase: GamePhase.COMBAT_REWARDS,
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
        
        // Continue to combat phase with first eligible player
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
          activePlayerId: playersWithIntrigueAndTroops[0].id,
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
      const updatedCombat = player.combatValue ? player.combatValue + 2 : 2;
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
          [action.playerId]: updatedCombat
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
        ...newState,
        activePlayerId: nextIndex
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
      const bonusSpice = {...newState.bonusSpice}
      BOARD_SPACES.forEach(s => {
        if(s.makerSpace && (!newState.occupiedSpaces[s.id] || newState.occupiedSpaces[s.id]?.length === 0)) {
          bonusSpice[s.makerSpace] += 1
        }
      })  
      newState.bonusSpice = bonusSpice
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
        p.revealed = false
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
            troopLimit: 0,
            removableTroops: 0,
            persuasionCount: 0,
            gainedEffects: [],
            acquiredCards: []
          }

      // Check for before-place-agent requirement on play effects
      const requiresReturn = card.playEffect?.some(e => e.beforePlaceAgent?.recallAgent)
      if (requiresReturn) {
        const spaceIds = Object.entries(state.occupiedSpaces)
          .filter(([, ids]) => ids.includes(playerId))
          .map(([sid]) => Number(sid))
        if (spaceIds.length === 0) {
          // No agents on board; cannot play this card
          return state
        }
        const updatedTurn = {
          ...currentTurn,
          gainedEffects: [...(currentTurn.gainedEffects || []), 'RECALL_REQUIRED']
        }
        return {
          ...state,
          selectedCard: cardId,
          currTurn: updatedTurn
        }
      }

      return {
        ...state,
        selectedCard: cardId,
        currTurn: currentTurn
      }
    }
    case 'PLACE_AGENT': {
      const { playerId, spaceId, sellMelangeData, selectiveBreedingData } = action
      const newState = {...state}
      const updatedGains: Gain[] = [...newState.gains]
      const updatedPlayers: Player[] = [...newState.players]
      const currPlayer: Player = {...updatedPlayers.find(p => p.id === playerId)} as Player
      const card = currPlayer.deck.find(c => c.id === newState.selectedCard)
      const space = BOARD_SPACES.find((s: SpaceProps) => s.id === spaceId)
      const tempCurrTurn: GameTurn = {
        playerId,
        type: TurnType.ACTION,
        cardId: card?.id,
        agentSpace: space?.agentIcon,
        canDeployTroops: space?.conflictMarker || false,
        troopLimit: space?.conflictMarker ? 2 + (newState.currTurn?.troopLimit|| 0): 0,
        removableTroops: 0,
        persuasionCount: 0,
        gainedEffects: [],
        acquiredCards: [],
        pendingChoices: []
      }
      
      function applyCardPlayEffect(effect: CardEffect, card: Card, space: SpaceProps) {
        if (effect.reward.spice) {
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.spice, type: RewardType.SPICE, source: GainSource.CARD })
          currPlayer.spice += effect.reward.spice
        }
        if (effect.reward.water) {
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.water, type: RewardType.WATER, source: GainSource.CARD })
          currPlayer.water += effect.reward.water
        }
        if (effect.reward.solari) {
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.solari, type: RewardType.SOLARI, source: GainSource.CARD })
          currPlayer.solari += effect.reward.solari
        }
        if (effect.reward.troops) {
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.troops, type: RewardType.TROOPS, source: GainSource.CARD })
          currPlayer.troops += effect.reward.troops
          tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit || 0) + effect.reward.troops
        }
        if (effect.reward.drawCards) {
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.drawCards, type: RewardType.DRAW, source: GainSource.CARD })
          currPlayer.handCount += effect.reward.drawCards
        }
        if ( effect.reward.intrigueCards) {
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.intrigueCards, type: RewardType.INTRIGUE, source: GainSource.CARD })
          currPlayer.intrigueCount += effect.reward.intrigueCards
        }
        if (effect.reward.custom) {
          switch (effect.reward.custom) {
            case CustomEffect.CARRYALL: {
              const spiceReward = space.effects?.find(e => e.reward.spice)?.reward.spice
              if (spiceReward) {
                  updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: spiceReward, type: RewardType.SPICE, source: GainSource.CARD })
                  currPlayer.spice += spiceReward
              }
              break
            }
            case CustomEffect.GUN_THOPTER:
              newState.players.forEach(p => {
                if(p.id !== playerId && p.troops > 0) {
                  updatedGains.push({ round: newState.currentRound, playerId: p.id, sourceId: card.id, name: card.name, amount: -1, type: RewardType.TROOPS, source: GainSource.CARD })
                  updatedPlayers[p.id].troops -= 1
                }
              })
              break
            
          }
        }
      }

      function applySpaceEffect(effect: {cost?: Cost, reward: Reward}, updatedGains: Gain[], newState: GameState, playerId: number, space: SpaceProps, currPlayer: Player): void {
        if (effect.reward.solari) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.solari, type: RewardType.SOLARI, source: GainSource.BOARD_SPACE })
          currPlayer.solari += effect.reward.solari
        }
        if (effect.reward.spice) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.spice, type: RewardType.SPICE, source: GainSource.BOARD_SPACE })
          currPlayer.spice += effect.reward.spice
          if (space.makerSpace) {
            const bonusSpice = { ...newState.bonusSpice }
            currPlayer.spice += bonusSpice[space.makerSpace]
            bonusSpice[space.makerSpace] = 0
            newState.bonusSpice = bonusSpice
          }
        }
        if (effect.reward.water) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.water, type: RewardType.WATER, source: GainSource.BOARD_SPACE })
          currPlayer.water += effect.reward.water
        }
        if (effect.reward.troops) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.troops, type: RewardType.TROOPS, source: GainSource.BOARD_SPACE })
          tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit || 0) + effect.reward.troops
          currPlayer.troops += effect.reward.troops
        }
        if (effect.reward.persuasion) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.persuasion, type: RewardType.PERSUASION, source: GainSource.BOARD_SPACE })
          currPlayer.persuasion += effect.reward.persuasion
        }
        if (effect.reward.drawCards) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.drawCards, type: RewardType.DRAW, source: GainSource.BOARD_SPACE })
          currPlayer.handCount += effect.reward.drawCards
        }
        if (effect.reward.intrigueCards) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.intrigueCards, type: RewardType.INTRIGUE, source: GainSource.BOARD_SPACE })
          currPlayer.intrigueCount += effect.reward.intrigueCards
        }
    }

      if (!currPlayer || !card || !space || playerId !== newState.activePlayerId || !newState.selectedCard) return state
      
      const ignoreSpaceCostAndReq = card.playEffect?.find(e => e.reward?.custom === CustomEffect.KWISATZ_HADERACH)
      // Handle recall-before-placement requirement: interpret this click as recall if needed
      if (newState.currTurn?.gainedEffects?.includes('RECALL_REQUIRED')) {
        const occupants = newState.occupiedSpaces[spaceId] || []
        if (!occupants.includes(playerId)) {
          // Not a valid recall click; ignore
          return state
        }
        // Remove the player's agent from that space and refund one agent
        newState.occupiedSpaces = {
          ...newState.occupiedSpaces,
          [spaceId]: occupants.filter(id => id !== playerId)
        }
        newState.players = newState.players.map(p => p.id === playerId ? { ...p, agents: p.agents + 1 } : p)
        // Clear the recall flag; keep selectedCard so player can now place
        newState.currTurn = {
          ...newState.currTurn,
          gainedEffects: (newState.currTurn?.gainedEffects || []).filter(e => e !== 'RECALL_REQUIRED')
        }
        return newState
      }
      
      // Check if player has any agents left
      if (currPlayer.agents <= 0) return state

      // Check if player can afford the space
      if (space.cost && !ignoreSpaceCostAndReq) {
        if (space.cost.solari && currPlayer.solari < space.cost.solari) return state
        if (space.cost.spice && currPlayer.spice < space.cost.spice) return state
        if (space.cost.water && currPlayer.water < space.cost.water) return state
      }

      // Check if space is already occupied or card has infiltrate
      if (newState.occupiedSpaces[spaceId]?.length > 0 && !card.infiltrate) return state

      // Check if player has required influence
      if (space.requiresInfluence && !ignoreSpaceCostAndReq) {
        const playerInfluence = newState.factionInfluence[space.requiresInfluence.faction as FactionType]?.[playerId] || 0
        if (playerInfluence < space.requiresInfluence.amount) return state
      }

      if(space.controlMarker) {
        const controlPlayerId = newState.controlMarkers[space.controlMarker]
        if(controlPlayerId) {
          if(space.controlBonus?.solari) {
            updatedPlayers[controlPlayerId].solari += space.controlBonus.solari
            updatedGains.push({ round: newState.currentRound, playerId: controlPlayerId, sourceId: space.id, name: space.name + " Control Bonus", amount: space.controlBonus.solari, type: RewardType.SOLARI, source: GainSource.CONTROL } )
          }
          if(space.controlBonus?.spice) {
            updatedPlayers[controlPlayerId].spice += space.controlBonus.spice
            updatedGains.push({ round: newState.currentRound, playerId: controlPlayerId, sourceId: space.id, name: space.name + " Control Bonus", amount: space.controlBonus.spice, type: RewardType.SPICE, source: GainSource.CONTROL } )
          }
        }
      }

      const updatedPlayArea = (selectiveBreedingData && card.id === selectiveBreedingData.trashedCardId) ? currPlayer.playArea : [...currPlayer.playArea, card]
      
      if (selectiveBreedingData) {
        if (space.cost?.spice) currPlayer.spice -= space.cost.spice;

        // Find the trashed card in any pile
        const allCards = [
          ...currPlayer.deck,
          ...currPlayer.playArea,
          ...currPlayer.discardPile,
        ];
        const trashedCard = allCards.find(c => c.id === selectiveBreedingData.trashedCardId);
        // If it was in the deck (i.e., in hand) and not played card, reduce handCount
        if (trashedCard && currPlayer.deck.includes(trashedCard) && trashedCard.id !== card.id) {
          currPlayer.handCount -= 1; 
        }
        currPlayer.deck = currPlayer.deck.filter(c => c.id !== selectiveBreedingData.trashedCardId);
        currPlayer.playArea = currPlayer.playArea.filter(c => c.id !== selectiveBreedingData.trashedCardId);
        currPlayer.discardPile = currPlayer.discardPile.filter(c => c.id !== selectiveBreedingData.trashedCardId);

        if (trashedCard) {
          currPlayer.trash = [...currPlayer.trash, trashedCard];
          currPlayer.handCount += 2;
        } else {
          console.log("Trashed card not found");
        }
      } else if (sellMelangeData) {
        currPlayer.spice -= sellMelangeData.spiceCost
        currPlayer.solari += sellMelangeData.solariReward
        updatedGains.push({ 
          round: newState.currentRound, 
          playerId: playerId, 
          sourceId: space.id, 
          name: space.name, 
          amount: sellMelangeData.solariReward, 
          type: RewardType.SOLARI, 
          source: GainSource.BOARD_SPACE
        })
      } else if (space.cost && !ignoreSpaceCostAndReq) {
        if (space.cost.solari) currPlayer.solari -= space.cost.solari
        if (space.cost.spice) currPlayer.spice -= space.cost.spice
        if (space.cost.water) currPlayer.water -= space.cost.water
      }
      
      if (space.effects) {
        space.effects.forEach(effect => {
          applySpaceEffect(effect, updatedGains, newState, playerId, space, currPlayer)
        })
      }

      // Build optional effects list (play effects with cost)
      const optionalEffects: OptionalEffect[] = []
      const choiceEffects: PlayEffect[] = [];
      if(card.playEffect) {
        card.playEffect?.filter((effect:PlayEffect) => {
            if(effect.choiceOpt) {
              choiceEffects.push(effect)
              return false;
            }
            if(effect.cost) {
              const effectId = card.name + crypto.randomUUID();
              optionalEffects.push({ id: effectId, cost: effect.cost as Cost, reward: effect.reward, source:{ type: GainSource.CARD, id: card.id, name: card.name } })
              return false;
            }
            return playRequirementSatisfied(effect, card, state, playerId)
           }).forEach(effect => {
          if(effect.reward) {
              applyCardPlayEffect(effect, card, space)
            }

        });
        if(choiceEffects.length>0) {
          const pendingChoices: PendingChoice[] = choiceEffects.map(r => getEffectChoice(currPlayer, card, r));
          tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), ...pendingChoices];
        }
      }
      
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

      const updatedDeck = currPlayer.deck.filter(c => c.id !== card.id)

      const canDeployTroops = tempCurrTurn?.canDeployTroops || false
      const troopLimit = canDeployTroops ? (tempCurrTurn?.troopLimit|| 2): 2
      const persuasionCount = tempCurrTurn?.persuasionCount || 0

      

      const currentTurn = newState.currTurn?.playerId === playerId 
        ? {
            ...newState.currTurn,
            agentSpace: space.agentIcon,
            canDeployTroops: canDeployTroops,
            troopLimit: troopLimit,
            removableTroops: newState.currTurn?.removableTroops || 0,
            persuasionCount: (newState.currTurn?.persuasionCount || 0) + persuasionCount,
            optionalEffects: [...(newState.currTurn?.optionalEffects||[]), ...optionalEffects],
            pendingChoices: [...(newState.currTurn?.pendingChoices||[]), ...(tempCurrTurn.pendingChoices||[])]
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
            gainedEffects: [],//TODO is this used?
            acquiredCards: [],
            optionalEffects: [...(newState.currTurn?.optionalEffects||[]), ...optionalEffects],
            pendingChoices: tempCurrTurn.pendingChoices || []
          }

      if (space.specialEffect) {
        currentTurn.gainedEffects = [...(currentTurn.gainedEffects || []), space.specialEffect]
        switch (space.specialEffect) {
          case 'mentat':
            newState.mentatOwner = playerId
            currPlayer.agents += 1
            break

          case 'swordmaster':
            currPlayer.hasSwordmaster = true
            currPlayer.agents += 1
            break

          case 'foldspace': {
            const card = newState.foldspaceDeck.pop()
            if (card) {
              currPlayer.discardPile.push(card)
            }
            break
          }

          case 'secrets':
            updatedPlayers.forEach(opponent => {
              if (opponent.id !== playerId && opponent.intrigueCount >= 4) {
                opponent.intrigueCount -= 1
                currPlayer.intrigueCount += 1
              }
            })
            break

        }
      }

      currPlayer.agents -= 1
      currPlayer.handCount -= 1

      return {
        ...newState,
        gains: updatedGains,
        players: updatedPlayers.map(p =>
          p.id === playerId
            ? {
                ...currPlayer,
                deck: updatedDeck,
                playArea: updatedPlayArea,
                selectedCard: null
              }
            : p
        ),
        occupiedSpaces: updatedOccupiedSpaces,
        currTurn: currentTurn,
        canEndTurn: currentTurn.pendingChoices?.length ? false : true
      }
    }
    case 'REVEAL_CARDS': {
      const { playerId, cardIds } = action
      const player: Player = {...state.players.find(p => p.id === playerId)} as Player
      const tempCurrTurn: GameTurn = {
        ...state.currTurn,
        playerId,
        canDeployTroops: state.currTurn?.canDeployTroops || false,
        troopLimit: state.currTurn?.troopLimit || 0,
        removableTroops: state.currTurn?.removableTroops || 0,
        persuasionCount: state.currTurn?.persuasionCount || 0,
        type: TurnType.REVEAL,
        gainedEffects: [],
        acquiredCards: [],
        pendingChoices: []
      }

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

      const optionalEffects: OptionalEffect[] = []
      const pendingChoices: PendingChoice[] = [...(state.currTurn?.pendingChoices||[])]
      revealedCards.forEach(card => {
        const orRewards: Reward[] = []
        card.revealEffect?.filter((effect:CardEffect) => {
            if(effect.choiceOpt) {
              orRewards.push(effect.reward)
              return false;
            }
            if(effect.cost) {
              const effectId = card.name + crypto.randomUUID();
              optionalEffects.push({ id: effectId, cost: effect.cost as Cost, reward: effect.reward, source:{ type: GainSource.CARD, id: card.id, name: card.name } })
              return false;
            }
            return revealRequirementSatisfied(effect, card, state, playerId, revealedCards);
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
            if(effect.reward?.intrigueCards) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.intrigueCards, type: RewardType.INTRIGUE, source: GainSource.CARD } )
              player.intrigueCount += effect.reward.intrigueCards
            }
            if(effect.reward?.deployTroops) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.deployTroops, type: RewardType.DEPLOY, source: GainSource.CARD } )
              tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit || 0) + effect.reward.deployTroops
              tempCurrTurn.canDeployTroops = true
            }
            if(effect.reward?.custom) {
              switch (effect.reward.custom) {
                case CustomEffect.LIET_KYNES: {
                  const fremenInPlay =  player.playArea.filter(c => c.faction?.includes(FactionType.FREMEN)).length
                  const fremenInReveal = revealedCards.filter(c => c.faction?.includes(FactionType.FREMEN)).length
                  const gainedPersuasion = (fremenInPlay + fremenInReveal) * 2
                  persuasionCount += gainedPersuasion
                  updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: gainedPersuasion, type: RewardType.PERSUASION, source: GainSource.CARD } )
                  break
                }
                default:
                  break
              }
            }
          })
        
      if(orRewards.length>0) {
        const choiceId = card.name + '-OR-' + crypto.randomUUID();
        const options = orRewards.map(r=>{
          let dis=false
          if(r.custom===CustomEffect.OTHER_MEMORY){
            const hasBG=player.discardPile.some(c=>c.faction?.includes(FactionType.BENE_GESSERIT))
            dis=!hasBG
          }
          return {reward:r,disabled:dis}
        })
        const fixedOptionsChoice: FixedOptionsChoice = {
          id: choiceId,
          type: ChoiceType.FIXED_OPTIONS,
          prompt: 'Choose one reward',
          options,
          source: { type: GainSource.CARD, id: card.id, name: card.name }
        };
        pendingChoices.push(fixedOptionsChoice)
      }
      })

      // Create or update the current turn
      const currentTurn = state.currTurn?.playerId === playerId 
        ? {
            ...state.currTurn,
            type: TurnType.REVEAL,
            ccanDeployTroops: tempCurrTurn.canDeployTroops,
            troopLimit: tempCurrTurn.troopLimit,
            removableTroops: tempCurrTurn.removableTroops,
            persuasionCount: (state.currTurn?.persuasionCount || 0) + persuasionCount,
            optionalEffects: [...(state.currTurn?.optionalEffects||[]), ...optionalEffects],
            pendingChoices: pendingChoices
          }
        : {
            playerId,
            type: TurnType.REVEAL,
            canDeployTroops: tempCurrTurn.canDeployTroops,
            troopLimit: tempCurrTurn.troopLimit,
            removableTroops: tempCurrTurn.removableTroops,
            persuasionCount: persuasionCount,
            gainedEffects: [],
            acquiredCards: [],
            optionalEffects,
            pendingChoices
          }

      // Update combat strength even if not in combat (so can be used later)
      const hasTroopsInCombat = (state.combatTroops[playerId] || 0) > 0
      const updatedCombatValue = player.combatValue ? player.combatValue + swordCount : swordCount + (state.combatTroops[playerId] ? (state.combatTroops[playerId] * 2): 0)
      const updatedCombatStrength = hasTroopsInCombat
        ? { ...state.combatStrength, [playerId]: (state.combatStrength[playerId] || 0) + swordCount }
        : state.combatStrength
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
        canEndTurn: pendingChoices.length>0? false : true,
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
      const discardPile = [...player.discardPile]
      discardPile.push(alDeck.pop() as Card)
      player.persuasion -= 2
      return {
        ...state,
        arrakisLiaisonDeck: alDeck,
        players: state.players.map(p => p.id === playerId ? { ...p, discardPile: 
        discardPile, persuasion: player.persuasion } : p)
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
    case 'PAY_COST': {
      const { playerId, effect } = action;
      const { cost, reward, data, source } = effect;
      const player: Player = {...state.players.find(p => p.id === playerId)} as Player
      if (!player) return state;
      const tempCurrTurn: GameTurn = {
        ...state.currTurn,
        troopLimit: state.currTurn?.troopLimit || 0,
        canDeployTroops: state.currTurn?.canDeployTroops || false,
        removableTroops: state.currTurn?.removableTroops || 0,
        persuasionCount: state.currTurn?.persuasionCount || 0,
      } as GameTurn

      function canPayCost(player: Player): boolean {
        if(cost.spice && player.spice < cost.spice) return false;
        if(cost.water && player.water < cost.water) return false;
        if(cost.solari && player.solari < cost.solari) return false;
        if(cost.troops && player.troops < cost.troops) return false;
        if(cost.trash && !data?.trashedCardId) return false;
        if(cost.trashThisCard && !data?.trashedCardId) return false;
        return true;
      }

      if(!canPayCost(player)) return state; // cannot afford

      // Deduct numeric resources
      if(cost.spice) player.spice -= cost.spice;
      if(cost.water) player.water -= cost.water;
      if(cost.solari) player.solari -= cost.solari;
      if(cost.troops) player.troops -= cost.troops;

      if(cost.trash) player.trash = [...(player.trash||[]), ...player.playArea.filter(c => c.id === data?.trashedCardId)];
      if(cost.trashThisCard) player.trash = [...(player.trash||[]), ...player.playArea.filter(c => c.id === source.id)];

      // Handle trashing this card (card assumed to be in playArea)
      if(cost.trashThisCard && source.type === GainSource.CARD) {
        const cardId = source.id;
        let trashedCard: Card | undefined;
        player.playArea = player.playArea.filter(c => { if(c.id===cardId){trashedCard=c;return false;} return true;});
        if(trashedCard) {
          player.trash = [...(player.trash||[]), trashedCard];
        } else {
          console.log("(Trash this card) card not found in playArea");
          return state;
        }
      }

      if(cost.trash) {
        const cardId = data?.trashedCardId;
        let trashedCard: Card | undefined;
        let isTrashedFromHand = false;
        player.playArea = player.playArea.filter(c => { if(c.id===cardId){trashedCard=c;return false;} return true;});
        player.deck = player.deck.filter(c => { if(c.id===cardId){trashedCard=c; isTrashedFromHand=true; return false;} return true;});
        player.discardPile = player.discardPile.filter(c => { if(c.id===cardId){trashedCard=c;return false;} return true;});
        if(trashedCard) {
          player.trash = [...(player.trash||[]), trashedCard];
          // If card trashed from hand (deck), fix handCount
          if(isTrashedFromHand) {
            player.handCount = Math.max(0, player.handCount - 1);
          }
        } else {
          console.log("Trashed card not found");
          return state;
        }
      }

      const newGains: Gain[] = [...state.gains];
      function pushGain(amount:number, type: RewardType) {
        if(!amount) return;
        newGains.push({
          round: state.currentRound,
          playerId,
          sourceId: source.id,
          name: source.name,
          amount,
          type,
          source: source.type
        });
      }

      if(reward.drawCards) {
        player.handCount += reward.drawCards;
        pushGain(reward.drawCards, RewardType.DRAW);
      }
      if(reward.spice) { player.spice += reward.spice; pushGain(reward.spice, RewardType.SPICE);}
      if(reward.water) { player.water += reward.water; pushGain(reward.water, RewardType.WATER);} 
      if(reward.solari) { player.solari += reward.solari; pushGain(reward.solari, RewardType.SOLARI);} 
      if(reward.troops) { player.troops += reward.troops; pushGain(reward.troops, RewardType.TROOPS);} 
      if(reward.deployTroops) {
        pushGain(reward.deployTroops, RewardType.DEPLOY);
        tempCurrTurn.troopLimit = tempCurrTurn.troopLimit ? tempCurrTurn.troopLimit + reward.deployTroops : reward.deployTroops;
        tempCurrTurn.canDeployTroops = true;
      }
      if(reward.victoryPoints) { player.victoryPoints += reward.victoryPoints; pushGain(reward.victoryPoints, RewardType.VICTORY_POINTS);} 

      // Remove cost from optionalEffects
      tempCurrTurn.optionalEffects = tempCurrTurn.optionalEffects?.filter(
        e => e.id !== effect.id
      );

      return {
        ...state,
        gains: newGains,
        players: state.players.map(p => p.id===playerId? player: p),
        currTurn: tempCurrTurn
      }
    }
    case 'RESOLVE_CHOICE': {
      const { playerId, reward, source } = action
      if(!state.currTurn) return state
      
      // Check if this reward has a custom effect that needs card selection
      if(reward.custom === CustomEffect.OTHER_MEMORY) {
        const player = state.players.find(p => p.id === playerId)
        if(!player) return state
        
        // Create a CardSelectChoice for the custom effect
        const choiceId = 'OTHER_MEMORY-' + crypto.randomUUID()
        const cardSelectChoice: CardSelectChoice = {
          id: choiceId,
          type: ChoiceType.CARD_SELECT,
          prompt: EFFECT_TEXTS[CustomEffect.OTHER_MEMORY],
          piles: [CardPile.DISCARD],
          filter: (c: Card) => c.faction?.includes(FactionType.BENE_GESSERIT) || false,
          selectionCount: 1,
          disabled: !player.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT)),
          onResolve: (cardIds: number[]) => ({
            type: 'CUSTOM_EFFECT',
            playerId: player.id,
            customEffect: CustomEffect.OTHER_MEMORY,
            data: { cardId: cardIds[0] }
          }),
          source: { type: GainSource.CARD, id: source?.id || 0, name: source?.name || 'Unknown' }
        }
        
        const newTurn = { ...state.currTurn }
        newTurn.pendingChoices = [cardSelectChoice]
        
        return {
          ...state,
          currTurn: newTurn,
          canEndTurn: false // Still have a choice pending
        }
      }
      
      // Normal reward without custom effect
      const newTurn = { ...state.currTurn }
      newTurn.pendingChoices = []
      let newState = { ...state, currTurn: newTurn }
      newState = applyChoiceReward(newState, reward, playerId)
      newState.canEndTurn = true // No more choices pending
      return newState
    }
    case 'RESOLVE_CARD_SELECT': {
      const { choiceId, cardIds } = action
      if(!state.currTurn) return state
      
      // Find the choice being resolved
      const choice = state.currTurn.pendingChoices?.find(c => c.id === choiceId)
      if (!choice || choice.type !== ChoiceType.CARD_SELECT) return state
      
      const cardSelectChoice = choice as CardSelectChoice
      
      // Execute the onResolve callback to get the action to dispatch
      const resolveAction = cardSelectChoice.onResolve(cardIds)
      
      // Clear all pending choices when user makes any choice
      const newTurn = { ...state.currTurn }
      newTurn.pendingChoices = []
      
      const newState = { 
        ...state, 
        currTurn: newTurn,
        canEndTurn: true // No more choices pending
      }
      
      // Recursively dispatch the resolve action
      return gameReducer(newState, resolveAction)
    }
    case 'CUSTOM_EFFECT': {
      const { playerId, customEffect, data } = action
      
      switch(customEffect) {
        case CustomEffect.OTHER_MEMORY: {
          const { cardId } = data 
          const player = state.players.find(p => p.id === playerId)
          if (!player) return state
          
          // Find the card in discard pile
          const cardIndex = player.discardPile.findIndex(c => c.id === cardId)
          if (cardIndex === -1) return state
          
          const card = player.discardPile[cardIndex]
          const newDiscardPile = player.discardPile.filter(c => c.id !== cardId)
          const newDeck = [card, ...player.deck]
          const newState = { ...state }
          // newState.gains.push({
          //   playerId,
          //   round: newState.currentRound,
          //   source: GainSource.CARD,
          //   sourceId: 0,
          //   name: 'Choice Reward',
          //   amount,
          //   type
          // })
          return {
            ...newState,
            players: newState.players.map(p =>
              p.id === playerId
              ? { ...p, discardPile: newDiscardPile, deck: newDeck, handCount: p.handCount + 1 }
              : p
            )
          }
        }
        default: {
          console.log("Custom effect not implemented: ", customEffect)
          return state
        }
      }
    }
    case 'TRASH_CARD': {
      const { playerId, cardId, gainReward } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      
      let card: Card | undefined
      const newPlayer = { ...player }
      
      // Find and remove the card from any pile
      const handIndex = player.deck.findIndex(c => c.id === cardId)
      const discardIndex = player.discardPile.findIndex(c => c.id === cardId)
      const playAreaIndex = player.playArea.findIndex(c => c.id === cardId)
      
      if (handIndex !== -1) {
        card = player.deck[handIndex]
        newPlayer.deck = player.deck.filter(c => c.id !== cardId)
        newPlayer.handCount = Math.max(0, player.handCount - 1)
      } else if (discardIndex !== -1) {
        card = player.discardPile[discardIndex]
        newPlayer.discardPile = player.discardPile.filter(c => c.id !== cardId)
      } else if (playAreaIndex !== -1) {
        card = player.playArea[playAreaIndex]
        newPlayer.playArea = player.playArea.filter(c => c.id !== cardId)
      }
      
      if (!card) return state
      
      // Add to trash
      newPlayer.trash = [...(player.trash || []), card]
      
      let newState = {
        ...state,
        players: state.players.map(p => p.id === playerId ? newPlayer : p)
      }
      
      // Apply any reward for trashing
      if (gainReward) {
        newState = applyChoiceReward(newState, gainReward, playerId)
      }
      
      return newState
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
    imperiumRow: [IMPERIUM_ROW_DECK[0], IMPERIUM_ROW_DECK[1], IMPERIUM_ROW_DECK[2], IMPERIUM_ROW_DECK[10]],
    intrigueDeck: [],
    dispatch
  }

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  )
} 

function getEffectChoice(currPlayer: Player, card: Card, effect: PlayEffect): CardSelectChoice | FixedOptionsChoice {
  const choiceId = card.name + '-OR-' + crypto.randomUUID();
  if(effect.cost?.trash) {
    return {
      id: choiceId,
      type: ChoiceType.CARD_SELECT,
      prompt: 'Choose a card to trash',
      piles: [CardPile.DECK, CardPile.DISCARD],
      selectionCount: 1,
      onResolve: (cardIds: number[]) => ({ 
        type: 'TRASH_CARD',
        playerId: currPlayer.id,
        cardId: cardIds[0],
        gainReward: effect.reward
      }),
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    }
    
  }
  if(effect.reward.trash) {
    return {
      id: choiceId,
      type: ChoiceType.CARD_SELECT,
      prompt: 'Choose a card to trash',
      piles: [CardPile.DECK, CardPile.DISCARD],
      selectionCount: 1,
      onResolve: (cardIds: number[]) => ({ 
        type: 'TRASH_CARD',
        playerId: currPlayer.id,
        cardId: cardIds[0]
      }),
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    }
  }
  if(effect.reward.custom===CustomEffect.OTHER_MEMORY) {
    return {
      id: choiceId,
      type: ChoiceType.CARD_SELECT,
      prompt: EFFECT_TEXTS[CustomEffect.OTHER_MEMORY],
      piles: [CardPile.DISCARD],
      filter: (c: Card) => c.faction?.includes(FactionType.BENE_GESSERIT) || false,
      selectionCount: 1,
      disabled: !currPlayer.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT)),
      onResolve: (cardIds: number[]) => ({
        type: 'CUSTOM_EFFECT',
        playerId: currPlayer.id,
        customEffect: CustomEffect.OTHER_MEMORY,
        data: { cardId: cardIds[0] }
      }),
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    }
  }
  // else create fixed options choice
  const options = [{cost:effect.cost,reward:effect.reward,rewardLabel: "test fixed"}]
  return{
    id: choiceId,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Choose one reward',
    options,
    source: { type: GainSource.CARD, id: card.id, name: card.name }
  };
}
