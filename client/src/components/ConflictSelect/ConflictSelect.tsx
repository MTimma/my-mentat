import React, { useState } from 'react'
import { ConflictCard } from '../../types/GameTypes'
import { conflictCardImageSrc } from '../../data/boardMarkerAnchors'
import { BoardScopedModal } from '../BoardScopedModal'
import './ConflictSelect.css'

interface ConflictSelectProps {
  conflicts: ConflictCard[]
  currentRound: number
  handleConflictSelect: (conflictId: number) => void
  /** Optional close without selecting (sandbox setup). */
  onCancel?: () => void
  title?: string
}

const ConflictSelect: React.FC<ConflictSelectProps> = ({
  conflicts,
  currentRound,
  handleConflictSelect,
  onCancel,
  title,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [failedCardImages, setFailedCardImages] = useState<Set<number>>(new Set())

  return (
    <BoardScopedModal
      isOpen
      overlayVariant="picker"
      overlayClassName="conflict-select-overlay"
    >
      <div className="conflict-select-dialog">
        <div className="conflict-cards-grid">
          {conflicts.map(card => {
            const cardImageSrc = conflictCardImageSrc(card.id)
            const showCardImage = Boolean(cardImageSrc && !failedCardImages.has(card.id))
            return (
              <div
                key={card.id}
                className={`conflict-card${selectedId === card.id ? ' selected' : ''}`}
                onClick={() => setSelectedId(card.id)}
                tabIndex={0}
                aria-pressed={selectedId === card.id}
                aria-label={`Select ${card.name}`}
                role="button"
              >
                {showCardImage ? (
                  <img
                    src={cardImageSrc ?? undefined}
                    alt={card.name}
                    className="conflict-card-image"
                    draggable={false}
                    data-preview-src={cardImageSrc ?? undefined}
                    onError={() => setFailedCardImages(prev => new Set(prev).add(card.id))}
                  />
                ) : (
                  <span className="conflict-card-fallback">{card.name}</span>
                )}
              </div>
            )
          })}
        </div>
        <div className="conflict-select-actions">
          <h2 className="conflict-select-title">{title ?? `Select Conflict Card - Round ${currentRound}`}</h2>
          {onCancel && (
            <button type="button" className="conflict-select-cancel modal-btn modal-btn--secondary" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            type="button"
            className="modal-btn modal-btn--primary"
            onClick={() => selectedId !== null && handleConflictSelect(selectedId)}
            disabled={selectedId === null}
          >
            Confirm
          </button>
        </div>
      </div>
    </BoardScopedModal>
  )
}

export default ConflictSelect
