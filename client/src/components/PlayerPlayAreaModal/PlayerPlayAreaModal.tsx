import React, { useEffect } from 'react'
import { Card, Player } from '../../types/GameTypes'
import { usePlayBoardModalContext } from '../../context/PlayBoardModalContext'
import { BoardScopedModal } from '../BoardScopedModal'
import type { RefObject } from 'react'
import './PlayerPlayAreaModal.css'

interface PlayerPlayAreaModalProps {
  player: Player | null
  isOpen: boolean
  onClose: () => void
  /** Override modal title (defaults to "Play Area"). */
  pileLabel?: string
  /** Override cards shown (defaults to player play area). */
  cards?: Card[]
  /** When set, overlay is scoped to this board container instead of the viewport. */
  containerRef?: RefObject<HTMLElement | null>
}

const PlayerPlayAreaModal: React.FC<PlayerPlayAreaModalProps> = ({
  player,
  isOpen,
  onClose,
  pileLabel = 'Play Area',
  cards: cardsOverride,
  containerRef,
}) => {
  const { boardContainerRef, scopeModalsToBoard } = usePlayBoardModalContext()
  const effectiveContainerRef =
    containerRef ?? (scopeModalsToBoard ? boardContainerRef : undefined)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !player) return null

  const cards: Card[] = cardsOverride ?? player.playArea ?? []

  return (
    <BoardScopedModal
      isOpen
      overlayClassName={[
        'player-play-area-overlay',
        effectiveContainerRef ? 'player-play-area-overlay--board-scoped' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      containerRef={effectiveContainerRef}
      onClose={onClose}
      closeOnOverlayClick
    >
      <div className="player-play-area-modal" onClick={event => event.stopPropagation()}>
        <div className="player-play-area-header">
          <h3>
            {player.leader.name} – {pileLabel} ({cards.length})
          </h3>
          <button className="player-play-area-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="player-play-area-body">
          {cards.length === 0 ? (
            <p className="player-play-area-empty">No cards in {pileLabel.toLowerCase()}</p>
          ) : (
            <div className="player-play-area-cards">
              {cards.map(card => (
                <div key={card.id} className="player-play-area-card">
                  {card.image ? (
                    <img
                      src={card.image}
                      alt={card.name}
                      className="player-play-area-card-image"
                      data-preview-src={card.image}
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
    </BoardScopedModal>
  )
}

export default PlayerPlayAreaModal
