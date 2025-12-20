import React, { useEffect, useState } from 'react'
import { Player, GameState, Gain, RewardType } from '../types/GameTypes'
import { getRewardIcon, getRewardDisplayName } from '../utils/rewardIcons'
import UndoConfirmDialog from './TimeTravel/UndoConfirmDialog'
import './TurnHistory.css'

interface TurnHistoryProps {
  turns: GameState[]
  currentTurn: number
  viewingTurnIndex: number | null
  players: Player[]
  currentGameState: GameState
  onTurnChange: (turnIndex: number) => void
  onReturnToCurrent: () => void
  onUndoToTurn: (turnIndex: number) => void
  onClose?: () => void
}

interface AggregatedGain {
  type: RewardType
  amount: number
}

const TurnHistory: React.FC<TurnHistoryProps> = ({ 
  turns, 
  currentTurn, 
  viewingTurnIndex,
  players, 
  currentGameState,
  onTurnChange, 
  onReturnToCurrent,
  onUndoToTurn,
  onClose 
}) => {
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null)
  const [undoTargetIndex, setUndoTargetIndex] = useState<number | null>(null)

  // Determine which turn is being viewed (null means current/live)
  const effectiveViewIndex = viewingTurnIndex ?? turns.length
  const isViewingHistory = viewingTurnIndex !== null

  // Get the turn info from GameState
  const getTurnInfo = (turn: GameState) => {
    const currTurn = turn.currTurn
    if (!currTurn) return { player: '-', type: '-', turn: null }
    const player = players.find(p => p.id === currTurn.playerId)
    return {
      player: player ? player.leader.name : `Player ${currTurn.playerId + 1}`,
      color: player ? player.color : 'gray',
      type: currTurn.type,
      turn: currTurn
    }
  }

  // Get gains for a specific turn and player
  const getGainsForTurn = (turn: GameState): Gain[] => {
    if (!turn.currTurn) return []
    const playerId = turn.currTurn.playerId
    return turn.gains?.filter(gain => gain.playerId === playerId) || []
  }

  // Aggregate gains by type (sum amounts of same type)
  const aggregateGains = (gains: Gain[]): AggregatedGain[] => {
    const aggregated = new Map<RewardType, number>()
    
    gains.forEach(gain => {
      const current = aggregated.get(gain.type) || 0
      aggregated.set(gain.type, current + gain.amount)
    })

    return Array.from(aggregated.entries())
      .map(([type, amount]) => ({ type, amount }))
      .filter(g => g.amount !== 0)
  }

  // Render a single gain icon with amount
  const renderGain = (gain: AggregatedGain, index: number) => {
    const iconPath = getRewardIcon(gain.type)
    const displayName = getRewardDisplayName(gain.type)
    const isNegative = gain.amount < 0
    const displayAmount = gain.amount > 0 ? `+${gain.amount}` : `${gain.amount}`

    return (
      <div key={index} className={`gain-item ${isNegative ? 'negative' : 'positive'}`}>
        <span className="gain-amount">{displayAmount}</span>
        {iconPath ? (
          <img 
            src={iconPath} 
            alt={displayName} 
            className="gain-icon"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              const textSpan = document.createElement('span')
              textSpan.className = 'gain-text-fallback'
              textSpan.textContent = displayName
              e.currentTarget.parentElement?.appendChild(textSpan)
            }}
          />
        ) : (
          <span className="gain-text-fallback">{displayName}</span>
        )}
      </div>
    )
  }

  // Handle keyboard navigation
  useEffect(() => {
    if (!onClose) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isViewingHistory) {
          onReturnToCurrent()
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, isViewingHistory, onReturnToCurrent])

  // Handle clicking on a turn row
  const handleTurnClick = (index: number) => {
    if (index === turns.length) {
      // Clicking on "Current" pseudo-entry
      onReturnToCurrent()
    } else {
      onTurnChange(index)
    }
  }

  // Handle undo button click
  const handleUndoClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation()
    setUndoTargetIndex(index)
  }

  // Confirm undo
  const handleUndoConfirm = () => {
    if (undoTargetIndex !== null) {
      onUndoToTurn(undoTargetIndex)
      setUndoTargetIndex(null)
    }
  }

  // Get target state for undo dialog
  const getUndoTargetState = (): GameState | null => {
    if (undoTargetIndex === null) return null
    if (undoTargetIndex >= 0 && undoTargetIndex < turns.length) {
      return turns[undoTargetIndex]
    }
    return null
  }

  return (
    <div
      id="turn-history-overlay"
      className={`turn-history-overlay ${isViewingHistory ? 'viewing-history' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Turn history"
    >
      <div className="turn-history-header">
        <div className="turn-history-nav">
          <button 
            onClick={() => onTurnChange(Math.max(0, effectiveViewIndex - 1))} 
            disabled={effectiveViewIndex === 0}
            title="Previous turn"
          >
            &lt;
          </button>
          <span>
            {isViewingHistory 
              ? `Viewing Turn ${(viewingTurnIndex ?? 0) + 1} / ${turns.length}`
              : `Turn ${turns.length + 1} (Current)`
            }
          </span>
          <button 
            onClick={() => {
              if (effectiveViewIndex < turns.length) {
                onTurnChange(effectiveViewIndex + 1)
              } else {
                onReturnToCurrent()
              }
            }} 
            disabled={!isViewingHistory}
            title="Next turn"
          >
            &gt;
          </button>
        </div>
        {isViewingHistory && (
          <button 
            className="return-to-current-btn"
            onClick={onReturnToCurrent}
          >
            Return to Current
          </button>
        )}
        {onClose && (
          <button 
            className="turn-history-close" 
            type="button" 
            aria-label="Close turn history" 
            onClick={onClose}
          >
            ×
          </button>
        )}
      </div>

      {isViewingHistory && (
        <div className="viewing-history-banner">
          <span className="history-icon">📜</span>
          <span>Viewing historical state - Actions disabled</span>
        </div>
      )}

      <div className="turn-history-list">
        {turns.map((turn, index) => {
          const info = getTurnInfo(turn)
          const gains = getGainsForTurn(turn)
          const aggregated = aggregateGains(gains)
          const isViewing = viewingTurnIndex === index
          const isCurrent = index === currentTurn && !isViewingHistory
          
          return (
            <div 
              key={index} 
              className={`turn-history-row ${isCurrent ? 'current' : ''} ${isViewing ? 'viewing' : ''}`}
              onClick={() => handleTurnClick(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleTurnClick(index)}
            >
              <div className="turn-number">{index + 1}</div>
              <div className={`turn-player-indicator ${info.color}`}></div>
              <div className="turn-player-name">{info.player}</div>
              <div className="turn-type">{info.type}</div>
              {aggregated.length > 0 && (
                <div className="turn-gains">
                  {aggregated.map((gain, idx) => renderGain(gain, idx))}
                </div>
              )}
              <div className="turn-actions">
                <button 
                  className="details-button" 
                  onClick={(e) => { e.stopPropagation(); setSelectedTurn(index) }}
                  title="View JSON details"
                >
                  Details
                </button>
                <button 
                  className="undo-button"
                  onClick={(e) => handleUndoClick(index, e)}
                  title={`Undo to turn ${index + 1}`}
                >
                  Undo
                </button>
              </div>
            </div>
          )
        })}
        
        {/* Current turn pseudo-entry */}
        <div 
          className={`turn-history-row current-turn-entry ${!isViewingHistory ? 'current viewing' : ''}`}
          onClick={() => onReturnToCurrent()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onReturnToCurrent()}
        >
          <div className="turn-number">{turns.length + 1}</div>
          <div className={`turn-player-indicator ${players.find(p => p.id === currentGameState.activePlayerId)?.color || 'gray'}`}></div>
          <div className="turn-player-name">
            {players.find(p => p.id === currentGameState.activePlayerId)?.leader?.name || 'Current Player'}
          </div>
          <div className="turn-type">
            {currentGameState.currTurn?.type || 'In Progress'}
          </div>
          <div className="current-indicator">
            <span className="live-dot"></span>
            LIVE
          </div>
        </div>
      </div>

      {/* JSON Details Modal */}
      {selectedTurn !== null && (
        <div className="turn-details-modal">
          <div className="turn-details-content">
            <h3>Turn {selectedTurn + 1} Details</h3>
            <pre>{JSON.stringify(turns[selectedTurn], null, 2)}</pre>
            <button className="close-button" onClick={() => setSelectedTurn(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Undo Confirmation Dialog */}
      <UndoConfirmDialog
        isOpen={undoTargetIndex !== null}
        targetTurnIndex={undoTargetIndex ?? 0}
        currentHistoryLength={turns.length}
        targetState={getUndoTargetState()}
        currentState={currentGameState}
        players={players}
        onConfirm={handleUndoConfirm}
        onCancel={() => setUndoTargetIndex(null)}
      />
    </div>
  )
}

export default TurnHistory
