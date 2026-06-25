import React from 'react'
import { Player, IntrigueCard } from '../types/GameTypes'
import { BoardDialogPanel, BoardScopedModal } from './BoardScopedModal'

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
  onCancel,
}) => {
  const eligibleTargets = players.filter(p => p.id !== currentPlayerId)

  return (
    <BoardScopedModal isOpen closeOnOverlayClick onClose={onCancel}>
      <BoardDialogPanel title={`Select Target for ${card.name}`} onClose={onCancel} showCancel cancelLabel="Clear all">
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
      </BoardDialogPanel>
    </BoardScopedModal>
  )
}

export default PlayerTargetDialog
