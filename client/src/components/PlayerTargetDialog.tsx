import React from 'react'
import { Player, IntrigueCard } from '../types/GameTypes'

interface PlayerTargetDialogProps {
  card: IntrigueCard
  players: Player[]
  currentPlayerId: number
  onSelectTarget: (targetId: number) => void
  onCancel: () => void
}

const PlayerTargetDialog: React.FC<PlayerTargetDialogProps> = ({
  card,
  players,
  currentPlayerId,
  onSelectTarget,
  onCancel
}) => {
  const eligibleTargets = players.filter(p => p.id !== currentPlayerId)

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div 
        className="target-dialog"
        onClick={e => e.stopPropagation()}
      >
        <h3>Select Target for {card.name}</h3>
        <p className="target-description">{card.description}</p>
        <div className="target-options">
          {eligibleTargets.map(player => (
            <button
              key={player.id}
              className={`target-button player-${player.color.toLowerCase()}`}
              onClick={() => onSelectTarget(player.id)}
            >
              <div className="target-player-info">
                <div className={`color-indicator ${player.color.toLowerCase()}`} />
                <span>{player.leader.name}</span>
              </div>
            </button>
          ))}
        </div>
        <button 
          className="cancel-button"
          onClick={onCancel}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}

export default PlayerTargetDialog 