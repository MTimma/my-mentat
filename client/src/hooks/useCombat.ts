import { useGame } from '../contexts/GameContext'
import { GamePhase, CardType } from '../types/GameTypes'

export function useCombat() {
  const { gameState, dispatch, currentConflict } = useGame()
  
  const addCombatStrength = (playerId: number, amount: number) => {
    dispatch({ type: 'ADD_COMBAT_STRENGTH', playerId, amount })
  }

  const playCombatIntrigue = (playerId: number, cardId: number) => {
    dispatch({ type: 'PLAY_COMBAT_INTRIGUE', playerId, cardId })
  }

  const resolveCombat = () => {
    dispatch({ type: 'RESOLVE_COMBAT' })
  }

  const getCombatStrength = (playerId: number): number => {
    const troops = gameState.combatTroops[playerId] || 0
    const swordIcons = gameState.combatStrength[playerId] || 0
    return (troops * 2) + swordIcons
  }

  const getPlayerRank = (playerId: number): number | null => {
    const strengths = Object.entries(gameState.combatTroops)
      .map(([id, troops]) => ({
        id: Number(id),
        strength: getCombatStrength(Number(id))
      }))
      .sort((a, b) => b.strength - a.strength)

    const index = strengths.findIndex(s => s.id === playerId)
    return index === -1 ? null : index + 1
  }

  const getEligiblePlayers = () => {
    return gameState.players.filter(p => 
      (gameState.combatTroops[p.id] || 0) > 0
    )
  }

  const getCurrentCombatPlayer = () => {
    const eligible = getEligiblePlayers()
    if (eligible.length === 0) return null

    // Start with first player
    let currentIndex = eligible.findIndex(p => p.id === gameState.firstPlayer)
    if (currentIndex === -1) currentIndex = 0

    // Find next player who hasn't passed consecutively
    for (let i = 0; i < eligible.length; i++) {
      const playerIndex = (currentIndex + i) % eligible.length
      const player = eligible[playerIndex]
      if (!gameState.combatPasses.includes(player.id)) {
        return player
      }
    }

    return null
  }

  const hasConsecutivePasses = () => {
    const eligible = getEligiblePlayers()
    return eligible.every(p => gameState.combatPasses.includes(p.id))
  }

  const getAvailableCombatCards = (playerId: number) => {
    const player = gameState.players.find(p => p.id === playerId)
    return player?.intrigueCards.filter(c => c.type === CardType.COMBAT) || []
  }

  return {
    currentConflict,
    addCombatStrength,
    playCombatIntrigue,
    resolveCombat,
    getCombatStrength,
    getPlayerRank,
    isInCombat: gameState.phase === GamePhase.COMBAT,
    combatTroops: gameState.combatTroops,
    currentCombatPlayer: getCurrentCombatPlayer(),
    eligiblePlayers: getEligiblePlayers(),
    hasConsecutivePasses: hasConsecutivePasses(),
    getAvailableCombatCards,
    passCombat: (playerId: number) => dispatch({ type: 'PASS_COMBAT', playerId })
  }
} 