import React, { createContext, useContext, useState, useCallback, useMemo, useLayoutEffect } from 'react'
import { GameState } from '../../types/GameTypes'
import {
  clampHistoryViewIndex,
  shouldHideLiveTurnForViewers,
} from '../../utils/endgameHistoryDisplay'
import {
  countPlayerTurns,
  getPlayerTurnNumber,
} from '../../utils/turnHistoryDisplay'

interface TimeTravelContextType {
  // Current viewing index (null = viewing live state)
  viewingTurnIndex: number | null
  
  // Whether we're viewing historical state
  isViewingHistory: boolean

  /** View-only in-progress: live turn is off-limits. */
  hideLiveTurn: boolean
  
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
  canEdit?: boolean
}

export const TimeTravelProvider: React.FC<TimeTravelProviderProps> = ({
  children,
  gameState,
  onUndoToTurn,
  canEdit = true,
}) => {
  const hideLiveTurn = shouldHideLiveTurnForViewers(canEdit, gameState)
  const historyLength = gameState.history.length
  const [viewingTurnIndex, setViewingTurnIndex] = useState<number | null>(() =>
    clampHistoryViewIndex(null, gameState.history.length, shouldHideLiveTurnForViewers(canEdit, gameState))
  )

  useLayoutEffect(() => {
    setViewingTurnIndex(prev => clampHistoryViewIndex(prev, historyLength, hideLiveTurn))
  }, [hideLiveTurn, historyLength])
  
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
    const snapshot = gameState.history[viewingTurnIndex]
    if (viewingTurnIndex === 0 || snapshot?.historyEntryKind === 'setup') {
      return 'Setup'
    }
    if (snapshot?.historyEntryKind === 'round-start') {
      return `Round ${snapshot.currentRound} start`
    }
    if (snapshot?.historyEntryKind === 'combat') {
      return 'Combat'
    }
    if (snapshot?.historyEntryKind === 'endgame') {
      return 'Endgame'
    }
    const turnNum = getPlayerTurnNumber(gameState.history, viewingTurnIndex)
    const totalPlayerTurns = countPlayerTurns(gameState.history)
    if (turnNum != null) {
      return `Turn ${turnNum} of ${totalPlayerTurns}`
    }
    return `Turn ${viewingTurnIndex} of ${gameState.history.length}`
  }, [viewingTurnIndex, gameState.history])
  
  // Navigate to a specific turn
  const goToTurn = useCallback((turnIndex: number) => {
    setViewingTurnIndex(clampHistoryViewIndex(turnIndex, gameState.history.length, hideLiveTurn))
  }, [gameState.history.length, hideLiveTurn])
  
  // Return to live, or last committed turn when live is hidden
  const returnToCurrent = useCallback(() => {
    setViewingTurnIndex(clampHistoryViewIndex(null, gameState.history.length, hideLiveTurn))
  }, [gameState.history.length, hideLiveTurn])
  
  // Navigate to previous turn
  const goToPreviousTurn = useCallback(() => {
    if (viewingTurnIndex === null) {
      if (gameState.history.length > 0) {
        setViewingTurnIndex(gameState.history.length - 1)
      }
    } else if (viewingTurnIndex > 0) {
      setViewingTurnIndex(viewingTurnIndex - 1)
    }
  }, [viewingTurnIndex, gameState.history.length])
  
  // Navigate to next turn
  const goToNextTurn = useCallback(() => {
    if (viewingTurnIndex === null) return
    setViewingTurnIndex(
      clampHistoryViewIndex(viewingTurnIndex + 1, gameState.history.length, hideLiveTurn)
    )
  }, [viewingTurnIndex, gameState.history.length, hideLiveTurn])
  
  // Undo to a specific turn
  const undoToTurn = useCallback((turnIndex: number) => {
    if (turnIndex >= 0 && turnIndex < gameState.history.length) {
      onUndoToTurn(turnIndex)
      setViewingTurnIndex(clampHistoryViewIndex(null, gameState.history.length, hideLiveTurn))
    }
  }, [gameState.history.length, hideLiveTurn, onUndoToTurn])
  
  const value: TimeTravelContextType = {
    viewingTurnIndex,
    isViewingHistory,
    hideLiveTurn,
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
