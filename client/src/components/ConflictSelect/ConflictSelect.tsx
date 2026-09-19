import React, { useState } from 'react'
import { ConflictCard } from '../../types/GameTypes'
import { conflictCardImageSrc } from '../../data/boardMarkerAnchors'
import { BoardScopedModal } from '../BoardScopedModal'
import { withImageZoomHint } from '../AltImagePreview/imageZoomHint'
import './ConflictSelect.css'

interface ConflictSelectProps {
  conflicts: ConflictCard[]
  currentRound: number
  handleConflictSelect?: (conflictId: number) => void
  /** Multi-select confirm (sandbox conflict discard). */
  handleConflictsSelect?: (conflictIds: number[]) => void
  /** Optional close without selecting (sandbox setup). */
  onCancel?: () => void
  title?: string
  multiSelect?: boolean
  initialSelectedIds?: number[]
  /** View previous conflicts without changing them. */
  readOnly?: boolean
  allowEmptyConfirm?: boolean
}

const ConflictSelect: React.FC<ConflictSelectProps> = ({
  conflicts,
  currentRound,
  handleConflictSelect,
  handleConflictsSelect,
  onCancel,
  title,
  multiSelect = false,
  initialSelectedIds,
  readOnly = false,
  allowEmptyConfirm = false,
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<number[]>(() =>
    multiSelect ? [...(initialSelectedIds ?? [])] : []
  )
  const [failedCardImages, setFailedCardImages] = useState<Set<number>>(new Set())

  const toggleMulti = (id: number) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(existing => existing !== id) : [...prev, id]))
  }

  const confirmDisabled = readOnly
    ? true
    : multiSelect
      ? !allowEmptyConfirm && selectedIds.length === 0
      : selectedId === null

  const handleConfirm = () => {
    if (readOnly) return
    if (multiSelect) {
      handleConflictsSelect?.(selectedIds)
      return
    }
    if (selectedId !== null) handleConflictSelect?.(selectedId)
  }

  const heading =
    title ??
    (multiSelect
      ? 'Select previous conflict cards'
      : readOnly
        ? 'Conflict discard'
        : `Select Conflict Card - Round ${currentRound}`)

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
            const isSelected = multiSelect ? selectedIds.includes(card.id) : selectedId === card.id
            return (
              <div
                key={card.id}
                className={`conflict-card${isSelected ? ' selected' : ''}${readOnly ? ' conflict-card--readonly' : ''}`}
                onClick={() => {
                  if (readOnly) return
                  if (multiSelect) toggleMulti(card.id)
                  else setSelectedId(card.id)
                }}
                tabIndex={readOnly ? -1 : 0}
                aria-pressed={readOnly ? undefined : isSelected}
                aria-label={
                  readOnly
                    ? card.name
                    : multiSelect
                      ? `${isSelected ? 'Remove' : 'Add'} ${card.name}`
                      : `Select ${card.name}`
                }
                role={readOnly ? 'img' : 'button'}
              >
                {showCardImage ? (
                  <img
                    src={cardImageSrc ?? undefined}
                    alt={card.name}
                    title={withImageZoomHint(card.name)}
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
          <h2 className="conflict-select-title">{heading}</h2>
          {multiSelect && !readOnly ? (
            <span className="conflict-select-count" aria-live="polite">
              {selectedIds.length} selected
            </span>
          ) : null}
          {onCancel && (
            <button type="button" className="conflict-select-cancel modal-btn modal-btn--secondary" onClick={onCancel}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
          )}
          {!readOnly && (
            <button
              type="button"
              className="modal-btn modal-btn--primary"
              onClick={handleConfirm}
              disabled={confirmDisabled}
            >
              Confirm
            </button>
          )}
        </div>
      </div>
    </BoardScopedModal>
  )
}

export default ConflictSelect
