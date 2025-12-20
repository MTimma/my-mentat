import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react'
import { GameState } from '../../types/GameTypes'

interface TimeTravelContextType {
  // Current viewing index (null = viewing live state)
  viewingTurnIndex: number | null
  
  // Whether we're viewing historical state
  isViewingHistory: boolean
  
  // The state to display (historical or live)
  displayState: GameState
  
  // Navigate to a specific turn in history
  goToTurn: (turnIndex: number) => void
  
  // Return to the current live state
  returnToCurrent: () => void
  
  // Navigate to previous turn
  goToPreviousTurn: () => void
  
  // Navigate to next turn
  goToNextTurn: () => void
  
  // Undo to a specific turn (destructive - requires confirmation handled by caller)
  undoToTurn: (turnIndex: number) => void
  
  // Get the total number of turns (history + current in progress)
  totalTurns: number
  
  // Get human-readable label for current viewing position
  viewingLabel: string
}

const TimeTravelContext = createContext<TimeTravelContextType | undefined>(undefined)

export const useTimeTravel = () => {
  const context = useContext(TimeTravelContext)
  if (!context) {
    throw new Error('useTimeTravel must be used within a TimeTravelProvider')
  }
  return context
}

interface TimeTravelProviderProps {
  children: React.ReactNode
  gameState: GameState
  onUndoToTurn: (turnIndex: number) => void
}

export const TimeTravelProvider: React.FC<TimeTravelProviderProps> = ({
  children,
  gameState,
  onUndoToTurn
}) => {
  const [viewingTurnIndex, setViewingTurnIndex] = useState<number | null>(null)
  
  // Calculate total turns: history entries + 1 for current in-progress
  const totalTurns = gameState.history.length + 1
  
  // Determine if we're viewing history
  const isViewingHistory = viewingTurnIndex !== null
  
  // Get the state to display
  const displayState = useMemo(() => {
    if (viewingTurnIndex === null) {
      // Viewing live state
      return gameState
    }
    
    // Viewing historical state
    if (viewingTurnIndex >= 0 && viewingTurnIndex < gameState.history.length) {
      return gameState.history[viewingTurnIndex]
    }
    
    // If viewing index equals history length, that's the "current" pseudo-entry
    if (viewingTurnIndex === gameState.history.length) {
      return gameState
    }
    
    // Invalid index, return live state
    return gameState
  }, [viewingTurnIndex, gameState])
  
  // Generate viewing label
  const viewingLabel = useMemo(() => {
    if (viewingTurnIndex === null) {
      return 'Current Turn'
    }
    if (viewingTurnIndex === gameState.history.length) {
      return 'Current Turn (in progress)'
    }
    return `Turn ${viewingTurnIndex + 1} of ${gameState.history.length}`
  }, [viewingTurnIndex, gameState.history.length])
  
  // Navigate to a specific turn
  const goToTurn = useCallback((turnIndex: number) => {
    if (turnIndex < 0) {
      setViewingTurnIndex(0)
    } else if (turnIndex >= gameState.history.length) {
      // Going to or past the end means return to live state
      setViewingTurnIndex(null)
    } else {
      setViewingTurnIndex(turnIndex)
    }
  }, [gameState.history.length])
  
  // Return to current live state
  const returnToCurrent = useCallback(() => {
    setViewingTurnIndex(null)
  }, [])
  
  // Navigate to previous turn
  const goToPreviousTurn = useCallback(() => {
    if (viewingTurnIndex === null) {
      // Currently viewing live, go to last history entry
      if (gameState.history.length > 0) {
        setViewingTurnIndex(gameState.history.length - 1)
      }
    } else if (viewingTurnIndex > 0) {
      setViewingTurnIndex(viewingTurnIndex - 1)
    }
  }, [viewingTurnIndex, gameState.history.length])
  
  // Navigate to next turn
  const goToNextTurn = useCallback(() => {
    if (viewingTurnIndex !== null) {
      if (viewingTurnIndex < gameState.history.length - 1) {
        setViewingTurnIndex(viewingTurnIndex + 1)
      } else {
        // At the end of history, return to live state
        setViewingTurnIndex(null)
      }
    }
  }, [viewingTurnIndex, gameState.history.length])
  
  // Undo to a specific turn
  const undoToTurn = useCallback((turnIndex: number) => {
    if (turnIndex >= 0 && turnIndex < gameState.history.length) {
      onUndoToTurn(turnIndex)
      // After undo, return to current (which will be the new state)
      setViewingTurnIndex(null)
    }
  }, [gameState.history.length, onUndoToTurn])
  
  // Reset viewing index if history shrinks (e.g., after undo)
  useEffect(() => {
    if (viewingTurnIndex !== null && viewingTurnIndex >= gameState.history.length) {
      setViewingTurnIndex(null)
    }
  }, [viewingTurnIndex, gameState.history.length])
  
  const value: TimeTravelContextType = {
    viewingTurnIndex,
    isViewingHistory,
    displayState,
    goToTurn,
    returnToCurrent,
    goToPreviousTurn,
    goToNextTurn,
    undoToTurn,
    totalTurns,
    viewingLabel
  }
  
  return (
    <TimeTravelContext.Provider value={value}>
      {children}
    </TimeTravelContext.Provider>
  )
}

export default TimeTravelContext
