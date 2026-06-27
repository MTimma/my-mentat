import { createContext, useContext, type Dispatch } from 'react'
import type { Card, ConflictCard, GameState, IntrigueCard } from '../../types/GameTypes'
import type { SaveDoc } from '../../save/types'
import type { GameAction } from './GameContext'

/** Kept in a separate module so Vite HMR does not recreate context when GameContext.tsx reloads. */
export interface GameContextType {
  gameState: GameState
  currentConflict: ConflictCard | null
  imperiumRow: Card[]
  intrigueDeck: IntrigueCard[]
  dispatch: Dispatch<GameAction>
  exportSaveDoc: (meta?: { id?: string; title?: string }) => SaveDoc
  getRecordedEventCount: () => number
}

export const GameContext = createContext<GameContextType | undefined>(undefined)

export const useGame = (): GameContextType => {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
