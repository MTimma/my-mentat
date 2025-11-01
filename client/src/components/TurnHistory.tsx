import React, { useState } from 'react'
import { Player, GameState, Gain, RewardType } from '../types/GameTypes'
import { getRewardIcon, getRewardDisplayName } from '../utils/rewardIcons'
import './TurnHistory.css'

interface TurnHistoryProps {
  turns: GameState[]
  currentTurn: number
  players: Player[]
  onTurnChange: (turnIndex: number) => void
}

interface AggregatedGain {
  type: RewardType
  amount: number
}

const TurnHistory: React.FC<TurnHistoryProps> = ({ turns, currentTurn, players, onTurnChange }) => {
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null)

  // Get the turn info from GameState
  const getTurnInfo = (turn: GameState) => {
    // Try to get the currTurn for this state
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
      .filter(g => g.amount !== 0) // Don't show zero gains
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
              // Fallback to text if icon fails to load
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

  return (
    <div className="turn-history-overlay">
      <div className="turn-history-header">
        <button onClick={() => onTurnChange(Math.max(0, currentTurn - 1))} disabled={currentTurn === 0}>&lt;</button>
        <span>Turn {currentTurn + 1} / {turns.length}</span>
        <button onClick={() => onTurnChange(Math.min(turns.length - 1, currentTurn + 1))} disabled={currentTurn === turns.length - 1}>&gt;</button>
      </div>
      <div className="turn-history-list">
        {turns.map((turn, index) => {
          const info = getTurnInfo(turn)
          const gains = getGainsForTurn(turn)
          const aggregated = aggregateGains(gains)
          
          return (
            <div key={index} className={`turn-history-row ${index === currentTurn ? 'current' : ''}`}>
              <div className={`turn-player-indicator ${info.color}`}></div>
              <div className="turn-player-name">{info.player}</div>
              <div className="turn-type">{info.type}</div>
              {aggregated.length > 0 && (
                <div className="turn-gains">
                  {aggregated.map((gain, idx) => renderGain(gain, idx))}
                </div>
              )}
              <button className="details-button" onClick={() => setSelectedTurn(index)}>Details</button>
            </div>
          )
        })}
      </div>
      {selectedTurn !== null && (
        <div className="turn-details-modal">
          <div className="turn-details-content">
            <h3>Turn Details</h3>
            <pre>{JSON.stringify(turns[selectedTurn], null, 2)}</pre>
            <button className="close-button" onClick={() => setSelectedTurn(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TurnHistory 