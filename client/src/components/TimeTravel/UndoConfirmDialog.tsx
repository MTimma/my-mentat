import React, { useEffect } from 'react'
import { GameState, Player, Gain } from '../../types/GameTypes'
import './UndoConfirmDialog.css'

interface UndoConfirmDialogProps {
  isOpen: boolean
  targetTurnIndex: number
  currentHistoryLength: number
  targetState: GameState | null
  currentState: GameState
  players: Player[]
  onConfirm: () => void
  onCancel: () => void
}

const UndoConfirmDialog: React.FC<UndoConfirmDialogProps> = ({
  isOpen,
  targetTurnIndex,
  currentHistoryLength,
  targetState,
  currentState,
  players,
  onConfirm,
  onCancel
}) => {
  // Handle escape key
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])
  
  if (!isOpen || !targetState) return null
  
  const turnsToUndo = currentHistoryLength - targetTurnIndex
  
  // Calculate what will be lost
  const calculateLosses = (): { gains: Gain[], description: string[] } => {
    const lostGains: Gain[] = []
    const descriptions: string[] = []
    
    // Get all gains from turns after the target
    for (let i = targetTurnIndex; i < currentHistoryLength; i++) {
      const historicalState = currentState.history[i]
      if (historicalState?.gains) {
        lostGains.push(...historicalState.gains)
      }
    }
    
    // Also add current state's gains if any
    if (currentState.gains) {
      lostGains.push(...currentState.gains)
    }
    
    // Summarize gains by player and type
    const gainsByPlayer: Record<number, Record<string, number>> = {}
    lostGains.forEach(gain => {
      if (!gainsByPlayer[gain.playerId]) {
        gainsByPlayer[gain.playerId] = {}
      }
      if (!gainsByPlayer[gain.playerId][gain.type]) {
        gainsByPlayer[gain.playerId][gain.type] = 0
      }
      gainsByPlayer[gain.playerId][gain.type] += gain.amount
    })
    
    // Generate descriptions
    Object.entries(gainsByPlayer).forEach(([playerId, gains]) => {
      const player = players.find(p => p.id === Number(playerId))
      const playerName = player?.leader?.name || `Player ${Number(playerId) + 1}`
      
      const gainDescriptions = Object.entries(gains)
        .filter(([, amount]) => amount !== 0)
        .map(([type, amount]) => {
          const sign = amount > 0 ? '+' : ''
          return `${sign}${amount} ${type}`
        })
      
      if (gainDescriptions.length > 0) {
        descriptions.push(`${playerName}: ${gainDescriptions.join(', ')}`)
      }
    })
    
    return { gains: lostGains, description: descriptions }
  }
  
  const losses = calculateLosses()
  
  // Calculate in-progress turn status
  const hasInProgressTurn = currentState.currTurn !== null || currentState.selectedCard !== null
  
  return (
    <div className="undo-confirm-overlay" onClick={onCancel}>
      <div className="undo-confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="undo-confirm-header">
          <span className="warning-icon">⚠️</span>
          <h2>Confirm Undo</h2>
        </div>
        
        <div className="undo-confirm-body">
          <p className="undo-main-warning">
            This will <strong>permanently undo {turnsToUndo} turn{turnsToUndo !== 1 ? 's' : ''}</strong> and cannot be reversed.
          </p>
          
          <div className="undo-details">
            <div className="undo-detail-row">
              <span className="detail-label">Reverting to:</span>
              <span className="detail-value">
                {targetTurnIndex === 0 ? 'Initial State' : `Turn ${targetTurnIndex}`}
              </span>
            </div>
            <div className="undo-detail-row">
              <span className="detail-label">Current turn:</span>
              <span className="detail-value">Turn {currentHistoryLength}</span>
            </div>
          </div>
          
          {hasInProgressTurn && (
            <div className="undo-warning-box">
              <strong>⚠️ In-Progress Turn Will Be Lost</strong>
              <p>The current turn has unsaved progress that will be discarded.</p>
            </div>
          )}
          
          {losses.description.length > 0 && (
            <div className="undo-losses-section">
              <h3>Resources & Progress That Will Be Lost:</h3>
              <ul className="losses-list">
                {losses.description.map((desc, idx) => (
                  <li key={idx}>{desc}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="undo-warning-final">
            <p>
              <strong>This action cannot be undone.</strong> All future turns will be permanently deleted.
            </p>
          </div>
        </div>
        
        <div className="undo-confirm-actions">
          <button className="cancel-button" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-button danger" onClick={onConfirm}>
            Undo {turnsToUndo} Turn{turnsToUndo !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UndoConfirmDialog
