import { Card, GameState, TurnType } from '../types/GameTypes'

export interface RevealTurnStats {
  totalPersuasion: number
  remainingPersuasion: number
  spentPersuasion: number
  acquiredCards: Card[]
}

export function getRevealTurnStats(state: GameState, playerId: number): RevealTurnStats | null {
  const currTurn = state.currTurn
  if (!currTurn || currTurn.playerId !== playerId || currTurn.type !== TurnType.REVEAL) {
    return null
  }

  const acquiredCards = currTurn.acquiredCards ?? []
  const totalPersuasion = currTurn.persuasionCount ?? 0
  const player = state.players.find(p => p.id === playerId)
  const remainingPersuasion = player?.persuasion ?? 0
  const spentPersuasion = Math.max(0, totalPersuasion - remainingPersuasion)

  return {
    totalPersuasion,
    remainingPersuasion,
    spentPersuasion,
    acquiredCards,
  }
}
