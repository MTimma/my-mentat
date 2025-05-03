import React, { useState } from 'react'
import { Player, GameState } from '../types/GameTypes'
import './TurnHistory.css'

interface TurnHistoryProps {
  turns: GameState[]
  currentTurn: number
  players: Player[]
  onTurnChange: (turnIndex: number) => void
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
          return (
            <div key={index} className={`turn-history-row ${index === currentTurn ? 'current' : ''}`}>
              <div className={`turn-player-indicator ${info.color}`}></div>
              <div className="turn-player-name">{info.player}</div>
              <div className="turn-type">{info.type}</div>
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