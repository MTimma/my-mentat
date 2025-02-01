import { useGame } from '../contexts/GameContext'

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

  return {
    currentConflict,
    addCombatStrength,
    playCombatIntrigue,
    resolveCombat,
    getCombatStrength,
    getPlayerRank,
    isInCombat: gameState.phase === GamePhase.COMBAT,
    combatTroops: gameState.combatTroops
  }
} 