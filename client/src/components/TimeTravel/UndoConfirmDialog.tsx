import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GameState, Player, Gain } from '../../types/GameTypes'
import { getPlayerTurnNumber } from '../../utils/turnHistoryDisplay'
import './UndoConfirmDialog.css'

interface UndoConfirmDialogProps {
  isOpen: boolean
  targetTurnIndex: number
  undoSourceRowIndex: number
  undoToSetup: boolean
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
  undoSourceRowIndex,
  undoToSetup,
  currentHistoryLength,
  targetState,
  currentState,
  players,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onCancel])
  
  if (!isOpen || !targetState) return null
  
  const turnsToUndo = undoToSetup
    ? currentHistoryLength + 1
    : Math.max(1, currentHistoryLength - undoSourceRowIndex + 1)

  const revertLabel = undoToSetup
    ? 'Setup'
    : targetTurnIndex === 0 || targetState.historyEntryKind === 'setup'
      ? 'Setup'
      : targetState.historyEntryKind === 'round-start'
        ? `Round ${targetState.currentRound} start`
        : targetState.historyEntryKind === 'combat'
          ? 'Combat'
          : (() => {
              const turnNum = getPlayerTurnNumber(currentState.history, targetTurnIndex)
              return turnNum != null ? `Turn ${turnNum}` : `Turn ${targetTurnIndex}`
            })()

  const calculateLosses = (): { gains: Gain[], description: string[] } => {
    const lostGains: Gain[] = []
    const descriptions: string[] = []
    
    const lossStartIndex = undoToSetup ? 0 : undoSourceRowIndex
    
    for (let i = lossStartIndex; i < currentHistoryLength; i++) {
      const historicalState = currentState.history[i]
      if (historicalState?.gains) {
        lostGains.push(...historicalState.gains)
      }
    }
    
    if (currentState.gains) {
      lostGains.push(...currentState.gains)
    }
    
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

  const dialog = (
    <div className="undo-confirm-overlay" onClick={onCancel}>
      <div className="undo-confirm-dialog" onClick={e => e.stopPropagation()}>
        <div className="undo-confirm-header">
          <h2>Confirm Undo</h2>
        </div>
        
        <div className="undo-confirm-body">
          <p className="undo-main-warning">
            This will reset{' '}
            {undoSourceRowIndex === 0 ? 'the initial setup' : `turn ${undoSourceRowIndex}`} and all
            future turns.
          </p>
          
          <div className="undo-details">
            <div className="undo-detail-row">
              <span className="detail-label">Reverting to:</span>
              <span className="detail-value">{revertLabel}</span>
            </div>
            <div className="undo-detail-row">
              <span className="detail-label">Current turn:</span>
              <span className="detail-value">Turn {currentHistoryLength}</span>
            </div>
          </div>
          
          {losses.description.length > 0 && (
            <div className="undo-losses-section">
              <h3>Resources & progress that will be lost</h3>
              <ul className="losses-list">
                {losses.description.map((desc, idx) => (
                  <li key={idx}>{desc}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <div className="undo-confirm-actions">
          <button className="cancel-button" type="button" onClick={onCancel}>
            Cancel
          </button>
          <button className="confirm-button" type="button" onClick={onConfirm}>
            Undo {turnsToUndo} Turn{turnsToUndo !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )

  return typeof document !== 'undefined' ? createPortal(dialog, document.body) : dialog
}

export default UndoConfirmDialog
