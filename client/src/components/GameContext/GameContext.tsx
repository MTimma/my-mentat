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
  CardPile,
  PendingReward,
  AUTO_APPLIED_CUSTOM_EFFECTS
} from '../../types/GameTypes'
import { BOARD_SPACES } from '../../data/boardSpaces'
import { ARRAKIS_LIAISON_DECK, IMPERIUM_ROW_DECK } from '../../data/cards'
import { SPICE_MUST_FLOW_DECK } from '../../data/cards'
import { FOLDSPACE_DECK } from '../../data/cards'
import { CONFLICTS } from '../../data/conflicts'
import { PLAY_EFFECT_TEXTS } from '../../data/effectTexts'
import { intrigueCards } from '../../services/IntrigueDeckService'

interface GameContextType {
  gameState: GameState
  currentConflict: ConflictCard | null
  imperiumRow: Card[]
  intrigueDeck: IntrigueCard[]
  dispatch: React.Dispatch<GameAction>
}

type CustomEffectData = { cardId?: number; [key: string]: unknown }

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
  | { type: 'CUSTOM_EFFECT'; playerId: number; customEffect: CustomEffect; data: CustomEffectData }
  | { type: 'TRASH_CARD'; playerId: number; cardId: number; gainReward?: Reward }
  | { type: 'SELECT_CONFLICT'; conflictId: number }
  | { type: 'CLAIM_REWARD'; playerId: number; rewardId: string; customData?: CustomEffectData }
  | { type: 'CLAIM_ALL_REWARDS'; playerId: number }
  | { type: 'OPPONENT_DISCARD_CHOICE'; playerId: number; opponentId: number; choice: 'discard' | 'loseTroop' }
  | { type: 'OPPONENT_DISCARD_CARD'; playerId: number; opponentId: number; cardId: number }
  | { type: 'OPPONENT_NO_CARD_ACK'; playerId: number; opponentId: number }
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
  intrigueDeck: [...intrigueCards],
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
  gains: [],
  pendingRewards: [],
  blockedSpaces: []
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

// Helper function to apply a reward to a player (shared by CLAIM_REWARD and CLAIM_ALL_REWARDS)
function applyRewardToPlayer(
  reward: Reward,
  player: Player,
  gains: Gain[],
  state: GameState,
  source: { type: GainSource; id: number; name: string }
): Player {
  const updatedPlayer = { ...player }
  
  if (reward.spice) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.spice,
      type: RewardType.SPICE,
      source: source.type
    })
    updatedPlayer.spice += reward.spice
  }
  
  if (reward.water) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.water,
      type: RewardType.WATER,
      source: source.type
    })
    updatedPlayer.water += reward.water
  }
  
  if (reward.solari) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.solari,
      type: RewardType.SOLARI,
      source: source.type
    })
    updatedPlayer.solari += reward.solari
  }
  
  if (reward.troops) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.troops,
      type: RewardType.TROOPS,
      source: source.type
    })
    updatedPlayer.troops += reward.troops
  }
  
  if (reward.drawCards) {
    for (let i = 0; i < reward.drawCards; i++) {
      const newCard = updatedPlayer.deck[0]
      if (newCard) {
        updatedPlayer.deck = updatedPlayer.deck.slice(1)
        updatedPlayer.handCount += 1
      }
    }
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.drawCards,
      type: RewardType.DRAW,
      source: source.type
    })
  }
  
  if (reward.intrigueCards) {
    gains.push({
      round: state.currentRound,
      playerId: player.id,
      sourceId: source.id,
      name: source.name,
      amount: reward.intrigueCards,
      type: RewardType.INTRIGUE,
      source: source.type
    })
    updatedPlayer.intrigueCount += reward.intrigueCards
  }
  
  if (reward.trash || reward.trashThisCard) {
    const trashedCardId = reward.trashThisCard || reward.trash
    const trashedCard = updatedPlayer.deck.find(c => c.id === trashedCardId)
    if (trashedCard) {
      updatedPlayer.deck = updatedPlayer.deck.filter(c => c.id !== trashedCardId)
      updatedPlayer.trash = [...updatedPlayer.trash, trashedCard]
    }
  }
  
  return updatedPlayer
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
  card: IntrigueCard,
  playerId: number
): GameState {
  const player = state.players.find(p => p.id === playerId)
  if (!player) return state

  const newState = { 
    ...state, 
    gains: [...state.gains],
    combatStrength: { ...state.combatStrength }
  }
  const updatedPlayers = state.players.map(p => ({ ...p }))
  const playerIndex = updatedPlayers.findIndex(p => p.id === playerId)
  const updatedPlayer = { ...updatedPlayers[playerIndex] }
  const pushGain = (amount: number, type: RewardType) => {
    newState.gains.push({
      round: state.currentRound,
      playerId,
      sourceId: card.id,
      name: card.name,
      amount,
      type,
      source: GainSource.INTRIGUE
    })
  }

  const applyReward = (reward: Reward) => {
    if (reward.spice) {
      updatedPlayer.spice += reward.spice
      pushGain(reward.spice, RewardType.SPICE)
    }
    if (reward.water) {
      updatedPlayer.water += reward.water
      pushGain(reward.water, RewardType.WATER)
    }
    if (reward.solari) {
      updatedPlayer.solari += reward.solari
      pushGain(reward.solari, RewardType.SOLARI)
    }
    if (reward.troops) {
      updatedPlayer.troops += reward.troops
      pushGain(reward.troops, RewardType.TROOPS)
    }
    if (reward.persuasion) {
      updatedPlayer.persuasion += reward.persuasion
      pushGain(reward.persuasion, RewardType.PERSUASION)
    }
    if (reward.victoryPoints) {
      updatedPlayer.victoryPoints += reward.victoryPoints
      pushGain(reward.victoryPoints, RewardType.VICTORY_POINTS)
    }
    if (reward.combat) {
      newState.combatStrength[playerId] = (newState.combatStrength[playerId] || 0) + reward.combat
      pushGain(reward.combat, RewardType.COMBAT)
    }
    if (reward.drawCards) {
      updatedPlayer.handCount += reward.drawCards
      pushGain(reward.drawCards, RewardType.DRAW)
    }
    if (reward.intrigueCards) {
      updatedPlayer.intrigueCount += reward.intrigueCards
      pushGain(reward.intrigueCards, RewardType.INTRIGUE)
    }
    if (reward.influence) {
      reward.influence.amounts.forEach(({ faction, amount }) => {
        const currentInfluence = newState.factionInfluence[faction]?.[playerId] || 0
        newState.factionInfluence = {
          ...newState.factionInfluence,
          [faction]: {
            ...newState.factionInfluence[faction],
            [playerId]: currentInfluence + amount
          }
        }
        pushGain(amount, RewardType.INFLUENCE)
      })
    }
  }

  card.playEffect?.forEach(effect => {
    if (!effect.reward) return
    if (!playRequirementSatisfied(effect, card, state, playerId)) return
    applyReward(effect.reward)
  })

  updatedPlayers[playerIndex] = updatedPlayer
  return {
    ...newState,
    players: updatedPlayers
  }
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
            gains: [],
            pendingRewards: []
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
          gains: [],
          pendingRewards: []
        }
      }
      
      let nextIndex = (playerId + 1) % newState.players.length
      let nextPlayer = newState.players[nextIndex]
      while(nextPlayer.revealed) {
        nextIndex = (nextIndex + 1) % newState.players.length
        nextPlayer = newState.players[nextIndex]
      }
      

      // Clear blocked spaces for the player whose turn is starting
      const clearedBlockedSpaces = (newState.blockedSpaces || []).filter(
        bs => bs.playerId !== nextPlayer.id
      )

      return {
        ...newState,
        blockedSpaces: clearedBlockedSpaces,
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
        gains: [],
        pendingRewards: []
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
      const lastPlayerId = (newState.firstPlayerMarker - 1 + newState.players.length) % newState.players.length
      
      // Check if combat should end
      if(newState.combatPasses.size === newState.players.length || 
        newState.players.every(p => (p.intrigueCount < 1 || newState.combatTroops[p.id] < 1))) {
        // everyone passed or noone has intrigue left
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
      } 
      
      // Check if we completed a full round (everyone passed once)
      if(lastPlayerId === playerId) {
        // All players have passed consecutively - end combat
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
      }

      // Find next eligible player
      let nextIndex = (playerId + 1) % newState.players.length
      let attempts = 0
      const maxAttempts = newState.players.length
      
      while(attempts < maxAttempts && 
            (newState.combatPasses.has(nextIndex) || 
             newState.players[nextIndex].intrigueCount < 1 || 
             newState.combatTroops[nextIndex] < 1)) {
        nextIndex = (nextIndex + 1) % newState.players.length
        attempts++
      }
      
      // If we couldn't find an eligible player, end combat
      if(attempts >= maxAttempts) {
        return {
          ...newState,
          combatPasses: new Set(),
          phase: GamePhase.COMBAT_REWARDS,
        }
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

      const updatedState = handleIntrigueEffect(state, card, playerId)
      const newState = {
        ...updatedState,
        players: updatedState.players.map(p =>
          p.id === playerId
            ? { ...p, intrigueCount: p.intrigueCount - 1 }
            : p
        ),
        intrigueDeck: updatedState.intrigueDeck.filter(c => c.id !== cardId),
        intrigueDiscard: [...updatedState.intrigueDiscard, card]
      }

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

      if (!card || card.type === IntrigueCardType.COMBAT) return state

      const updatedState = handleIntrigueEffect(state, card, playerId)
      
      const newState = {
        ...updatedState,
        players: updatedState.players.map(p =>
          p.id === playerId
            ? { ...p, intrigueCount: p.intrigueCount - 1 }
            : p
        ),
        intrigueDeck: updatedState.intrigueDeck.filter(c => c.id !== cardId),
        intrigueDiscard: [...updatedState.intrigueDiscard, card]
      }

      return newState
    }
    case 'PLAY_CARD': {
      const { playerId, cardId } = action
      const player = state.players.find(p => p.id === playerId)
      const card = player?.deck.find(c => c.id === cardId)
      
      if (state.currTurn?.opponentDiscardState) {
        return state
      }


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
      const pendingRewards: PendingReward[] = [...newState.pendingRewards]
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
      
      // Helper to add pending reward
      const addPendingReward = (reward: Reward, source: { type: GainSource; id: number; name: string }, isTrash: boolean = false) => {
        const rewardId = `${source.type}-${source.id}-${crypto.randomUUID()}`
        pendingRewards.push({
          id: rewardId,
          source,
          reward,
          isTrash
        })
      }
      
      function applyCardPlayEffect(effect: CardEffect, card: Card, space: SpaceProps) {
        // Add to pendingRewards: spice, water, solari, troops, drawCards, intrigueCards
        if (effect.reward.spice) {
          addPendingReward({ spice: effect.reward.spice }, { type: GainSource.CARD, id: card.id, name: card.name })
        }
        if (effect.reward.water) {
          addPendingReward({ water: effect.reward.water }, { type: GainSource.CARD, id: card.id, name: card.name })
        }
        if (effect.reward.solari) {
          addPendingReward({ solari: effect.reward.solari }, { type: GainSource.CARD, id: card.id, name: card.name })
        }
        if (effect.reward.troops) {
          addPendingReward({ troops: effect.reward.troops }, { type: GainSource.CARD, id: card.id, name: card.name })
        }
        if (effect.reward.drawCards) {
          addPendingReward({ drawCards: effect.reward.drawCards }, { type: GainSource.CARD, id: card.id, name: card.name })
        }
        if (effect.reward.intrigueCards) {
          addPendingReward({ intrigueCards: effect.reward.intrigueCards }, { type: GainSource.CARD, id: card.id, name: card.name })
        }
        
        // Auto-apply pooled rewards: deployTroops
        if (effect.reward.deployTroops) {
          tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit || 0) + effect.reward.deployTroops
          updatedGains.push({ round: newState.currentRound, playerId: currPlayer.id, sourceId: card.id, name: card.name, amount: effect.reward.deployTroops, type: RewardType.DEPLOY, source: GainSource.CARD })
        }
        
        // Auto-apply custom effects (calculated effects)
        if (effect.reward.custom) {
          switch (effect.reward.custom) {
            case CustomEffect.CARRYALL: {
              const spiceReward = space.effects?.find(e => e.reward.spice)?.reward.spice
              if (spiceReward) {
                addPendingReward({ spice: spiceReward }, { type: GainSource.CARD, id: card.id, name: card.name })
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
            default:
              if (!AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
                addPendingReward({ custom: effect.reward.custom }, { type: GainSource.CARD, id: card.id, name: card.name })
              }
          }
        }
        
        // Handle trash rewards
        if (effect.reward.trash || effect.reward.trashThisCard) {
          addPendingReward({ trash: effect.reward.trash, trashThisCard: effect.reward.trashThisCard }, { type: GainSource.CARD, id: card.id, name: card.name }, true)
        }
      }

      function applySpaceEffect(effect: {cost?: Cost, reward: Reward}, updatedGains: Gain[], newState: GameState, playerId: number, space: SpaceProps, currPlayer: Player): void {
        // Add to pendingRewards: solari, spice, water, troops, drawCards, intrigueCards
        if (effect.reward.solari) {
          addPendingReward({ solari: effect.reward.solari }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.spice) {
          let totalSpice = effect.reward.spice
          // Add bonus spice from maker spaces
          if (space.makerSpace) {
            const bonusSpice = { ...newState.bonusSpice }
            totalSpice += bonusSpice[space.makerSpace]
            bonusSpice[space.makerSpace] = 0
            newState.bonusSpice = bonusSpice
          }
          addPendingReward({ spice: totalSpice }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.water) {
          addPendingReward({ water: effect.reward.water }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.troops) {
          addPendingReward({ troops: effect.reward.troops }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.drawCards) {
          addPendingReward({ drawCards: effect.reward.drawCards }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.intrigueCards) {
          addPendingReward({ intrigueCards: effect.reward.intrigueCards }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
        }
        if (effect.reward.custom) {
          // For SECRETS_STEAL, check if any opponents have 4+ intrigue
          if (effect.reward.custom === CustomEffect.SECRETS_STEAL) {
            const hasEligibleTargets = updatedPlayers.some(p => 
              p.id !== playerId && p.intrigueCount >= 4
            )
            addPendingReward(
              { custom: effect.reward.custom }, 
              { type: GainSource.BOARD_SPACE, id: space.id, name: space.name }
            )
            // Mark as disabled if no eligible targets
            if (!hasEligibleTargets) {
              const lastReward = pendingRewards[pendingRewards.length - 1]
              if (lastReward) {
                lastReward.disabled = true
              }
            }
          } else if (!AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
            addPendingReward({ custom: effect.reward.custom }, { type: GainSource.BOARD_SPACE, id: space.id, name: space.name })
          }
        }
        
        // Auto-apply pooled rewards: persuasion, deployTroops
        if (effect.reward.persuasion) {
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.persuasion, type: RewardType.PERSUASION, source: GainSource.BOARD_SPACE })
          currPlayer.persuasion += effect.reward.persuasion
        }
        if (effect.reward.deployTroops) {
          tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit || 0) + effect.reward.deployTroops
          updatedGains.push({ round: newState.currentRound, playerId: playerId, sourceId: space.id, name: space.name, amount: effect.reward.deployTroops, type: RewardType.DEPLOY, source: GainSource.BOARD_SPACE })
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

      // Check if space is blocked by The Voice
      const blockedSpace = newState.blockedSpaces?.find(bs => bs.spaceId === spaceId)
      if (blockedSpace && blockedSpace.playerId !== playerId) {
        // Space is blocked for this opponent
        return state
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
              // Check if this is an auto-applied custom effect
              if(effect.reward.custom && AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
                // Don't add to choices, will be applied immediately
                return true;
              }
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
        if(choiceEffects.length > 0) {
          // Group all choice effects into a single FixedOptionsChoice
          const choiceId = card.name + '-OR-' + crypto.randomUUID();
          
          // Check if any effects need card selection
          const cardSelectEffect = choiceEffects.find(e => 
            e.cost?.trash || e.reward.trash || e.reward.custom === CustomEffect.OTHER_MEMORY
          );
          
          if (cardSelectEffect && choiceEffects.length === 1) {
            // Single effect that needs card selection
            const pendingChoice = getEffectChoice(currPlayer, card, cardSelectEffect);
            tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), pendingChoice];
          } else if (choiceEffects.length === 1) {
            // Single regular choice - shouldn't happen but handle it
            const pendingChoice = getEffectChoice(currPlayer, card, choiceEffects[0]);
            tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), pendingChoice];
          } else {
            // Multiple OR choices - create single FixedOptionsChoice with all options
            const options = choiceEffects.map(effect => {
              let disabled = false;
              if(effect.reward.custom === CustomEffect.OTHER_MEMORY) {
                const hasBG = currPlayer.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT));
                disabled = !hasBG;
              }
              return { cost: effect.cost, reward: effect.reward, disabled };
            });
            
            const fixedOptionsChoice: FixedOptionsChoice = {
              id: choiceId,
              type: ChoiceType.FIXED_OPTIONS,
              prompt: 'Choose one reward',
              options,
              source: { type: GainSource.CARD, id: card.id, name: card.name }
            };
            tempCurrTurn.pendingChoices = [...(tempCurrTurn.pendingChoices||[]), fixedOptionsChoice];
          }
        }
      }
      
      // Add influence to pending rewards (single bumps)
      if (space.influence) {
        // Check if Power Play effect is active for this placement
        const hasPowerPlay = card.playEffect?.some(e => e.reward.custom === CustomEffect.POWER_PLAY)
        const influenceReward = { influence: { amounts: [space.influence] } }
        const pendingReward = {
          id: `${GainSource.BOARD_SPACE}-${space.id}-${crypto.randomUUID()}`,
          source: { type: GainSource.BOARD_SPACE, id: space.id, name: space.name },
          reward: influenceReward,
          isTrash: false,
          powerPlay: hasPowerPlay
        }
        pendingRewards.push(pendingReward)
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
              currPlayer.discardPile = [...currPlayer.discardPile, card]
            }
            break
          }

          case 'secrets':
            // Steal logic is now handled by SECRETS_STEAL custom effect button
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
        pendingRewards,
        canEndTurn: (currentTurn.pendingChoices?.length || pendingRewards.filter(r => !r.disabled).length) ? false : true
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

      // Calculate reveal effects - pooled resources
      let persuasionCount = 0
      let swordCount = 0

      const updatedGains: Gain[] = [...state.gains]
      const pendingRewards: PendingReward[] = [...state.pendingRewards]

      // Helper to add pending reward from card
      const addPendingReward = (reward: Reward, source: { type: GainSource; id: number; name: string }, isTrash: boolean = false) => {
        const rewardId = `${source.type}-${source.id}-${crypto.randomUUID()}`
        pendingRewards.push({
          id: rewardId,
          source,
          reward,
          isTrash
        })
      }

      if(player.hasHighCouncilSeat) {
        updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: 0, name: "High Council Seat", amount: 2, type: RewardType.PERSUASION, source: GainSource.HIGH_COUNCIL } )
        persuasionCount += 2
      }

      const optionalEffects: OptionalEffect[] = []
      const pendingChoices: PendingChoice[] = [...(state.currTurn?.pendingChoices||[])]
      revealedCards.forEach(card => {
        const choiceEffects: RevealEffect[] = []
        card.revealEffect?.filter((effect:CardEffect) => {
            if(effect.choiceOpt) {
              // Check if this is an auto-applied custom effect
              if(effect.reward.custom && AUTO_APPLIED_CUSTOM_EFFECTS.includes(effect.reward.custom)) {
                // Don't add to choices, will be applied immediately
                return true;
              }
              choiceEffects.push(effect)
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
            // Auto-apply pooled rewards: persuasion, combat
            if(effect.reward?.persuasion) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.persuasion, type: RewardType.PERSUASION, source: GainSource.CARD } )
              persuasionCount += effect.reward.persuasion
            }
            if(effect.reward?.combat) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.combat, type: RewardType.COMBAT, source: GainSource.CARD } )
              swordCount += effect.reward.combat
            }
            
            // Add to pendingRewards: spice, water, solari, intrigueCards
            if(effect.reward?.spice) {
              addPendingReward({ spice: effect.reward.spice }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if(effect.reward?.water) {
              addPendingReward({ water: effect.reward.water }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if(effect.reward?.solari) {
              addPendingReward({ solari: effect.reward.solari }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            if(effect.reward?.intrigueCards) {
              addPendingReward({ intrigueCards: effect.reward.intrigueCards }, { type: GainSource.CARD, id: card.id, name: card.name })
            }
            
            // Auto-apply pooled: deployTroops
            if(effect.reward?.deployTroops) {
              updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name, amount: effect.reward.deployTroops, type: RewardType.DEPLOY, source: GainSource.CARD } )
              tempCurrTurn.troopLimit = (tempCurrTurn.troopLimit || 0) + effect.reward.deployTroops
              tempCurrTurn.canDeployTroops = true
            }
            
            // Auto-apply custom calculated effects
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
                case CustomEffect.GUILD_BANKERS:
                  // Add as pending reward for user to activate
                  addPendingReward({ custom: effect.reward.custom }, { type: GainSource.CARD, id: card.id, name: card.name })
                  break
                default:
                  break
              }
            }
          })
        
      // Process choice effects
      if(choiceEffects.length > 0) {
        const choiceId = card.name + '-OR-' + crypto.randomUUID();
        
        // Check if any effects need card selection
        const cardSelectEffect = choiceEffects.find(e => 
          e.cost?.trash || e.reward.trash || e.reward.custom === CustomEffect.OTHER_MEMORY
        );
        
        if (cardSelectEffect && choiceEffects.length === 1) {
          // Single effect that needs card selection
          const pendingChoice = getEffectChoice(player, card, cardSelectEffect as PlayEffect);
          pendingChoices.push(pendingChoice);
        } else if (choiceEffects.length === 1) {
          // Single regular choice
          const pendingChoice = getEffectChoice(player, card, choiceEffects[0] as PlayEffect);
          pendingChoices.push(pendingChoice);
        } else {
          // Multiple OR choices - create single FixedOptionsChoice with all options
          const options = choiceEffects.map(effect => {
            let disabled = false;
            if(effect.reward.custom === CustomEffect.OTHER_MEMORY) {
              const hasBG = player.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT));
              disabled = !hasBG;
            }
            return { cost: effect.cost, reward: effect.reward, disabled };
          });
          
          const fixedOptionsChoice: FixedOptionsChoice = {
            id: choiceId,
            type: ChoiceType.FIXED_OPTIONS,
            prompt: 'Choose one reward',
            options,
            source: { type: GainSource.CARD, id: card.id, name: card.name }
          };
          pendingChoices.push(fixedOptionsChoice);
        }
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
                revealed: true
              }
            : p
        ),
        combatStrength: updatedCombatStrength,
        currTurn: currentTurn,
        pendingRewards,
        canEndTurn: (pendingChoices.length > 0 || pendingRewards.filter(r => !r.disabled).length > 0) ? false : true,
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
      
      // Check for Guild Bankers discount
      const hasDiscount = state.currTurn?.smfDiscount === true
      const cost = hasDiscount ? Math.max(0, 9 - 3) : 9
      
      if (player.persuasion < cost) return state
      const smfDeck = [...state.spiceMustFlowDeck]
      const card = smfDeck.pop() as Card
      const updatedGains: Gain[] = [...state.gains]
      if(card.acquireEffect?.victoryPoints) {
        updatedGains.push({ round: state.currentRound, playerId: playerId, sourceId: card.id, name: card.name + " Acquire Effect", amount: card.acquireEffect.victoryPoints, type: RewardType.VICTORY_POINTS, source: GainSource.CARD } )
        player.victoryPoints += card.acquireEffect?.victoryPoints || 0
      }
      player.discardPile.push(card)
      player.persuasion -= cost
      
      // Clear discount flag after use
      const newCurrTurn = state.currTurn ? { ...state.currTurn, smfDiscount: false } : null
      
      return {
        ...state,
        spiceMustFlowDeck: smfDeck,
        gains: updatedGains,
        currTurn: newCurrTurn,
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
          prompt: PLAY_EFFECT_TEXTS[CustomEffect.OTHER_MEMORY] || CustomEffect.OTHER_MEMORY,
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
      
      // Check if this is a SECRETS_STEAL custom effect
      if(reward.custom === CustomEffect.SECRETS_STEAL) {
        // Dispatch CUSTOM_EFFECT action
        const newTurn = { ...state.currTurn }
        newTurn.pendingChoices = []
        const newState = { 
          ...state, 
          currTurn: newTurn,
          canEndTurn: true
        }
        return gameReducer(newState, {
          type: 'CUSTOM_EFFECT',
          playerId,
          customEffect: CustomEffect.SECRETS_STEAL,
          data: {}
        })
      }
      
      // Normal reward without custom effect
      const newTurn = { ...state.currTurn }
      newTurn.pendingChoices = []
      const newState = applyChoiceReward(state, reward, playerId)
      newState.currTurn = newTurn
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
      const resolveAction = cardSelectChoice.onResolve(cardIds) as GameAction
      
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
        case CustomEffect.SECRETS_STEAL: {
          const player = state.players.find(p => p.id === playerId)
          if (!player) return state
          
          // Steal 1 intrigue from each opponent with 4+ intrigue
          const newPlayers = state.players.map(p => {
            if (p.id !== playerId && p.intrigueCount >= 4) {
              return { ...p, intrigueCount: p.intrigueCount - 1 }
            }
            return p
          })
          
          // Count how many intrigue cards were stolen
          const stolenCount = newPlayers.filter(p => {
            if (p.id === playerId) return false
            const originalPlayer = state.players.find(op => op.id === p.id)
            return originalPlayer && originalPlayer.intrigueCount > p.intrigueCount
          }).length
          
          // Update the player with stolen intrigue
          return {
            ...state,
            players: newPlayers.map(p => 
              p.id === playerId 
                ? { ...p, intrigueCount: p.intrigueCount + stolenCount }
                : p
            )
          }
        }
        case CustomEffect.POWER_PLAY: {
          const pendingRewards = state.pendingRewards.map(r => ({ ...r }))
          const target = pendingRewards.find(r => 
            r.source.type === GainSource.BOARD_SPACE && Boolean(r.reward.influence)
          )
          if (!target) return state
          target.powerPlay = true
          return {
            ...state,
            pendingRewards
          }
        }
        case CustomEffect.REVEREND_MOTHER_MOHIAM: {
          const player = state.players.find(p => p.id === playerId)
          if (!player) return state
          
          // Check if player has another Bene Gesserit card in play
          const hasBeneGesseritInPlay = player.playArea.some(c => 
            c.faction?.includes(FactionType.BENE_GESSERIT) && c.id !== data?.cardId
          )
          
          if (!hasBeneGesseritInPlay) {
            // Effect doesn't trigger
            return state
          }
          
          // Initialize opponent discard state
          const opponents = state.players
            .filter(p => p.id !== playerId)
            .map(p => p.id)
          if (opponents.length === 0) return state
          const discardCounts: Record<number, number> = {}
          opponents.forEach(id => { discardCounts[id] = 0 })
          return {
            ...state,
            currTurn: state.currTurn ? {
              ...state.currTurn,
              opponentDiscardState: {
                effect: CustomEffect.REVEREND_MOTHER_MOHIAM,
                remainingOpponents: opponents,
                currentOpponent: opponents[0],
                discardCounts
              }
            } : null
          }
        }
        case CustomEffect.TEST_OF_HUMANITY: {
          // Initialize opponent choice state
          const opponents = state.players.filter(p => p.id !== playerId).map(p => p.id)
          if (opponents.length === 0) return state
          const discardCounts: Record<number, number> = {}
          opponents.forEach(id => { discardCounts[id] = 0 })
          return {
            ...state,
            currTurn: state.currTurn ? {
              ...state.currTurn,
              opponentDiscardState: {
                effect: CustomEffect.TEST_OF_HUMANITY,
                remainingOpponents: opponents,
                currentOpponent: opponents[0],
                discardCounts
              }
            } : null
          }
        }
        case CustomEffect.THE_VOICE: {
          const { spaceId } = data
          if (typeof spaceId !== 'number') return state
          
          // Block the space for opponents until this player's next turn
          const newBlockedSpaces = [...(state.blockedSpaces || [])]
          newBlockedSpaces.push({ spaceId, playerId })
          
          return {
            ...state,
            blockedSpaces: newBlockedSpaces
          }
        }
        case CustomEffect.GUILD_BANKERS: {
          // Set SMF discount flag for this reveal turn
          return {
            ...state,
            currTurn: state.currTurn ? {
              ...state.currTurn,
              smfDiscount: true
            } : null
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
    case 'CLAIM_REWARD': {
      const { playerId, rewardId, customData } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      
      // Find the reward
      const reward = state.pendingRewards.find(r => r.id === rewardId)
      if (!reward) return state
      if (reward.reward.custom === CustomEffect.THE_VOICE && (typeof customData?.spaceId !== 'number')) {
        return state
      }
      
      const newState = { ...state }
      let newPlayer = { ...player }
      const newGains = [...state.gains]
      
      // If this is a trash reward, remove all pending rewards from the same card source
      if (reward.isTrash) {
        // Remove all pending rewards from the SAME card source
        newState.pendingRewards = state.pendingRewards.filter(r => 
          !(r.source.type === reward.source.type && r.source.id === reward.source.id)
        )
      } else {
        // Regular reward - just remove this one
        newState.pendingRewards = state.pendingRewards.filter(r => r.id !== rewardId)
      }
      
      // Handle custom effects before applying reward
      if (reward.reward.custom) {
        // Dispatch CUSTOM_EFFECT action for other custom effects
        const customEffectState = {
          ...newState,
          pendingRewards: state.pendingRewards.filter(r => r.id !== rewardId),
          players: state.players.map(p => p.id === playerId ? newPlayer : p),
          gains: newGains
        }
        return gameReducer(customEffectState, {
          type: 'CUSTOM_EFFECT',
          playerId,
          customEffect: reward.reward.custom,
          data: customData || {}
        })
      }
      
      // Apply the reward using shared helper
      newPlayer = applyRewardToPlayer(reward.reward, newPlayer, newGains, state, reward.source)
      
      // Handle influence updates (needs state modification)
      if (reward.reward.influence) {
        reward.reward.influence.amounts.forEach(inf => {
          const currentInfluence = newState.factionInfluence[inf.faction]?.[playerId] || 0
          // Power Play grants +1 extra influence
          const influenceAmount = reward.powerPlay ? inf.amount + 1 : inf.amount
          newState.factionInfluence = {
            ...newState.factionInfluence,
            [inf.faction]: {
              ...newState.factionInfluence[inf.faction],
              [playerId]: currentInfluence + influenceAmount
            }
          }
        })
      }
      
      // If troops were recruited during this turn on a combat space, increase troopLimit
      if (reward.reward.troops && newState.currTurn?.canDeployTroops) {
        newState.currTurn = {
          ...newState.currTurn,
          troopLimit: (newState.currTurn.troopLimit || 0) + reward.reward.troops
        }
      }
      
      // Update player
      newState.players = newState.players.map(p => p.id === playerId ? newPlayer : p)
      newState.gains = newGains
      
      // Update canEndTurn based on remaining pendingRewards and pendingChoices
      newState.canEndTurn = (newState.pendingRewards.filter(r => !r.disabled).length === 0 && (!newState.currTurn?.pendingChoices?.length))
      
      return newState
    }
    case 'CLAIM_ALL_REWARDS': {
      const { playerId } = action
      const player = state.players.find(p => p.id === playerId)
      if (!player) return state
      
      const newState = { ...state }
      let newPlayer = { ...player }
      const newGains = [...state.gains]
      
      // Group rewards by source to identify sources with trash
      const sourcesWithTrash = new Set<string>()
      
      // Find all sources that contain trash rewards
      state.pendingRewards.forEach(r => {
        if (r.isTrash) {
          sourcesWithTrash.add(`${r.source.type}-${r.source.id}`)
        }
      })
      
      // Apply rewards only from sources WITHOUT trash and that are NOT disabled
      const rewardsToApply = state.pendingRewards.filter(r => 
        !sourcesWithTrash.has(`${r.source.type}-${r.source.id}`) &&
        !r.disabled &&
        !r.reward.custom
      )
      
      // Track total troops recruited for troopLimit update
      let totalTroopsRecruited = 0
      
      // Apply each reward using shared helper
      rewardsToApply.forEach(reward => {
        newPlayer = applyRewardToPlayer(reward.reward, newPlayer, newGains, state, reward.source)
        
        // Track troops recruited
        if (reward.reward.troops) {
          totalTroopsRecruited += reward.reward.troops
        }
        
        // Handle influence updates (needs state modification)
        if (reward.reward.influence) {
          reward.reward.influence.amounts.forEach(inf => {
            const currentInfluence = newState.factionInfluence[inf.faction]?.[playerId] || 0
            // Power Play grants +1 extra influence
            const influenceAmount = reward.powerPlay ? inf.amount + 1 : inf.amount
            newState.factionInfluence = {
              ...newState.factionInfluence,
              [inf.faction]: {
                ...newState.factionInfluence[inf.faction],
                [playerId]: currentInfluence + influenceAmount
              }
            }
          })
        }
      })
      
      // If troops were recruited during this turn on a combat space, increase troopLimit
      if (totalTroopsRecruited > 0 && newState.currTurn?.canDeployTroops) {
        newState.currTurn = {
          ...newState.currTurn,
          troopLimit: (newState.currTurn.troopLimit || 0) + totalTroopsRecruited
        }
      }
      
      // Remove all applied rewards from pendingRewards (keep only trash sources and disabled rewards)
      newState.pendingRewards = state.pendingRewards.filter(r => 
        sourcesWithTrash.has(`${r.source.type}-${r.source.id}`) || r.disabled
      )
      
      // Update player and gains
      newState.players = newState.players.map(p => p.id === playerId ? newPlayer : p)
      newState.gains = newGains
      
      // Update canEndTurn based on remaining pendingRewards and pendingChoices (excluding disabled rewards)
      newState.canEndTurn = (newState.pendingRewards.filter(r => !r.disabled).length === 0 && (!newState.currTurn?.pendingChoices?.length))
      
      return newState
    }
    case 'OPPONENT_DISCARD_CHOICE': {
      const { playerId: actingPlayerId, opponentId, choice } = action
      if (!state.currTurn?.opponentDiscardState) return state
      if (actingPlayerId !== state.activePlayerId) return state
      
      const discardState = state.currTurn.opponentDiscardState
      if (discardState.currentOpponent !== opponentId) return state
      
      const opponent = state.players.find(p => p.id === opponentId)
      if (!opponent) return state
      
      if (choice === 'loseTroop') {
        // Remove one deployed troop from combat
        const currentTroops = state.combatTroops[opponentId] || 0
        if (currentTroops <= 0) return state
        
        const newCombatTroops = { ...state.combatTroops }
        newCombatTroops[opponentId] = currentTroops - 1
        
        const newCombatStrength = { ...state.combatStrength }
        const currentStrength = newCombatStrength[opponentId] || 0
        if (currentStrength >= 2) {
          newCombatStrength[opponentId] = currentStrength - 2
        } else {
          delete newCombatStrength[opponentId]
        }
        
        // Move to next opponent
        const remainingOpponents = discardState.remainingOpponents.filter(id => id !== opponentId)
        const newOpponentDiscardState = remainingOpponents.length > 0 ? {
          ...discardState,
          remainingOpponents,
          currentOpponent: remainingOpponents[0],
          discardCounts: discardState.discardCounts
        } : undefined
        
        return {
          ...state,
          combatTroops: newCombatTroops,
          combatStrength: newCombatStrength,
          players: state.players.map(p =>
            p.id === opponentId
              ? { ...p, troops: p.troops + 1, combatValue: p.combatValue ? p.combatValue - 2 : 0 }
              : p
          ),
          currTurn: state.currTurn ? {
            ...state.currTurn,
            opponentDiscardState: newOpponentDiscardState
          } : null,
          canEndTurn: newOpponentDiscardState === undefined && state.pendingRewards.filter(r => !r.disabled).length === 0
        }
      } else {
        // Choice is discard - will be handled by OPPONENT_DISCARD_CARD action
        return state
      }
    }
    case 'OPPONENT_DISCARD_CARD': {
      const { playerId: actingPlayerId, opponentId, cardId } = action
      if (!state.currTurn?.opponentDiscardState) return state
      if (actingPlayerId !== state.activePlayerId) return state
      
      const discardState = state.currTurn.opponentDiscardState
      if (discardState.currentOpponent !== opponentId) return state
      
      const opponent = state.players.find(p => p.id === opponentId)
      if (!opponent) return state
      
      // Find and move card from deck to discard pile
      const cardIndex = opponent.deck.findIndex(c => c.id === cardId)
      if (cardIndex === -1) return state
      
      // Ensure card is not in playArea (already revealed)
      if (opponent.playArea.some(c => c.id === cardId)) return state
      
      const card = opponent.deck[cardIndex]
      const newDeck = opponent.deck.filter(c => c.id !== cardId)
      const newDiscardPile = [...opponent.discardPile, card]
      
      // Update discard count for this opponent
      const discardCounts = { ...(discardState.discardCounts || {}) }
      discardCounts[opponentId] = (discardCounts[opponentId] || 0) + 1
      
      // For Reverend Mother Mohiam, each opponent discards 2 cards
      const requiredDiscards = discardState.effect === CustomEffect.REVEREND_MOTHER_MOHIAM ? 2 : 1
      let hasDiscardedEnough = discardCounts[opponentId] >= requiredDiscards

      if (!hasDiscardedEnough && discardState.effect === CustomEffect.REVEREND_MOTHER_MOHIAM) {
        const cardsRemaining = newDeck.length
        if (cardsRemaining === 0) {
          discardCounts[opponentId] = requiredDiscards
          hasDiscardedEnough = true
        }
      }

      const remainingOpponents = discardState.remainingOpponents.filter(id => id !== opponentId)
      const newOpponentDiscardState = remainingOpponents.length > 0 ? {
        ...discardState,
        remainingOpponents,
        currentOpponent: remainingOpponents[0],
        discardCounts
      } : undefined
      
      if (!hasDiscardedEnough) {
        // Opponent needs to discard more cards
        return {
          ...state,
          players: state.players.map(p =>
            p.id === opponentId
              ? { ...p, deck: newDeck, discardPile: newDiscardPile, handCount: Math.max(0, p.handCount - 1) }
              : p
          ),
          currTurn: state.currTurn ? {
            ...state.currTurn,
            opponentDiscardState: {
              ...discardState,
              discardCounts
            }
          } : null
        }
      }
      
      // Opponent has discarded enough, move to next
      return {
        ...state,
        players: state.players.map(p =>
          p.id === opponentId
            ? { ...p, deck: newDeck, discardPile: newDiscardPile, handCount: Math.max(0, p.handCount - 1) }
            : p
        ),
        currTurn: state.currTurn ? {
          ...state.currTurn,
          opponentDiscardState: newOpponentDiscardState
        } : null,
        canEndTurn: newOpponentDiscardState === undefined && state.pendingRewards.filter(r => !r.disabled).length === 0
      }
    }
    case 'OPPONENT_NO_CARD_ACK': {
      const { playerId: actingPlayerId, opponentId } = action
      if (!state.currTurn?.opponentDiscardState) return state
      if (actingPlayerId !== state.activePlayerId) return state
      const discardState = state.currTurn.opponentDiscardState
      if (discardState.currentOpponent !== opponentId) return state
      if (discardState.effect !== CustomEffect.REVEREND_MOTHER_MOHIAM) return state
      const opponent = state.players.find(p => p.id === opponentId)
      if (!opponent || opponent.deck.length > 0) return state

      const discardCounts = { ...(discardState.discardCounts || {}) }
      discardCounts[opponentId] = 2

      const remainingOpponents = discardState.remainingOpponents.filter(id => id !== opponentId)
      const newOpponentDiscardState = remainingOpponents.length > 0 ? {
        ...discardState,
        remainingOpponents,
        currentOpponent: remainingOpponents[0],
        discardCounts
      } : undefined

      return {
        ...state,
        currTurn: state.currTurn ? {
          ...state.currTurn,
          opponentDiscardState: newOpponentDiscardState
        } : null,
        canEndTurn: newOpponentDiscardState === undefined && state.pendingRewards.filter(r => !r.disabled).length === 0
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
    imperiumRow: gameState.imperiumRow,
    intrigueDeck: gameState.intrigueDeck,
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
  
  // Handle trash cost - requires card selection
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
  
  // Handle trash reward - requires card selection
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
  
  // Handle custom effects that need card selection
  if(effect.reward.custom === CustomEffect.OTHER_MEMORY) {
    const hasValidCard = currPlayer.discardPile.some(c => c.faction?.includes(FactionType.BENE_GESSERIT))
    return {
      id: choiceId,
      type: ChoiceType.CARD_SELECT,
      prompt: PLAY_EFFECT_TEXTS[CustomEffect.OTHER_MEMORY] || CustomEffect.OTHER_MEMORY,
      piles: [CardPile.DISCARD],
      filter: (c: Card) => c.faction?.includes(FactionType.BENE_GESSERIT) || false,
      selectionCount: 1,
      disabled: !hasValidCard,
      onResolve: (cardIds: number[]) => ({
        type: 'CUSTOM_EFFECT',
        playerId: currPlayer.id,
        customEffect: CustomEffect.OTHER_MEMORY,
        data: { cardId: cardIds[0] }
      }),
      source: { type: GainSource.CARD, id: card.id, name: card.name }
    }
  }
  
  // For all other cases (regular OR choices), create fixed options choice
  // This shouldn't happen for single effects, only for OR choices
  const options = [{cost: effect.cost, reward: effect.reward}]
  return {
    id: choiceId,
    type: ChoiceType.FIXED_OPTIONS,
    prompt: 'Choose one reward',
    options,
    source: { type: GainSource.CARD, id: card.id, name: card.name }
  };
}
