import React, { useState } from 'react'
import { GameTurn, TurnType, Player } from '../types/GameTypes'

interface TurnHistoryProps {
  turns: GameTurn[]
  currentTurn: number
  players: Player[]
}

const TurnHistory: React.FC<TurnHistoryProps> = ({ turns, currentTurn, players }) => {
  const [selectedTurn, setSelectedTurn] = useState<number | null>(null)

  const getPlayerColor = (playerId: number) => {
    const player = players.find(p => p.id === playerId)
    return player?.color || 'gray'
  }

  const renderTurnContent = (turn: GameTurn, index: number) => {
    if (turn.type === TurnType.ACTION) {
      return (
        <div className="turn-content">
          <div className={`turn-player-indicator ${getPlayerColor(turn.playerId)}`}></div>
          <div className={`placement-dot ${turn.agentSpaceType}`}></div>
          {selectedTurn === index && (
            <div className="turn-hover-box">
              <div className="close-button" onClick={(e) => {
                e.stopPropagation();
                setSelectedTurn(null);
              }}>×</div>
              Card ID: {turn.cardId}
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div className="turn-content">
          <div className={`turn-player-indicator ${getPlayerColor(turn.playerId)}`}></div>
          <div className="turn-type">Pass</div>
          {selectedTurn === index && (
            <div className="turn-hover-box">
              <div className="close-button" onClick={(e) => {
                e.stopPropagation();
                setSelectedTurn(null);
              }}>×</div>
              Cards acquired: {turn.acquiredCards?.length || 0}
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div className="turn-history">
      {turns.map((turn, index) => (
        <React.Fragment key={index}>
          <div 
            className={`turn-box ${index === currentTurn ? 'current' : ''}`}
            onClick={() => setSelectedTurn(index)}
          >
            {renderTurnContent(turn, index)}
          </div>
          {index < turns.length - 1 && (
            <div className="turn-arrow">→</div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

export default TurnHistory 