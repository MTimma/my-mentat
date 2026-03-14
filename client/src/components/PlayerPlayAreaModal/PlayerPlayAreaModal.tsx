import React from 'react'
import { Card, Player } from '../../types/GameTypes'
import './PlayerPlayAreaModal.css'

interface PlayerPlayAreaModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
}

const PlayerPlayAreaModal: React.FC<PlayerPlayAreaModalProps> = ({ player, isOpen, onClose }) => {
  if (!isOpen || !player) return null

  const cards: Card[] = player.playArea ?? []

  return (
    <div
      className="dialog-overlay player-play-area-overlay"
      onClick={(e) => { e.stopPropagation(); onClose() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label="Close play area"
    >
      <div className="player-play-area-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-play-area-header">
          <h3>{player.leader.name} – Play Area ({cards.length})</h3>
          <button
            className="player-play-area-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="player-play-area-body">
          {cards.length === 0 ? (
            <p className="player-play-area-empty">No cards in play area</p>
          ) : (
            <div className="player-play-area-cards">
              {cards.map((card) => (
                <div key={card.id} className="player-play-area-card">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="player-play-area-card-image"
                    />
                  ) : (
                    <div className="player-play-area-card-fallback">
                      <span className="player-play-area-card-name">{card.name}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default PlayerPlayAreaModal
