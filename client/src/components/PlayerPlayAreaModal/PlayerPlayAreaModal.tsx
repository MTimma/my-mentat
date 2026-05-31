import React from 'react'
import { Card, Player } from '../../types/GameTypes'
import './PlayerPlayAreaModal.css'

interface PlayerPlayAreaModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
  /** Override modal title (defaults to "Play Area"). */
  pileLabel?: string
  /** Override cards shown (defaults to player play area). */
  cards?: Card[]
}

const PlayerPlayAreaModal: React.FC<PlayerPlayAreaModalProps> = ({
  player,
  isOpen,
  onClose,
  pileLabel = 'Play Area',
  cards: cardsOverride,
}) => {
  if (!isOpen || !player) return null

  const cards: Card[] = cardsOverride ?? player.playArea ?? []

  return (
    <div
      className="dialog-overlay player-play-area-overlay"
      onClick={(e) => { e.stopPropagation(); onClose() }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      aria-label={`Close ${pileLabel.toLowerCase()}`}
    >
      <div className="player-play-area-modal" onClick={(e) => e.stopPropagation()}>
        <div className="player-play-area-header">
          <h3>{player.leader.name} – {pileLabel} ({cards.length})</h3>
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
            <p className="player-play-area-empty">No cards in {pileLabel.toLowerCase()}</p>
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
