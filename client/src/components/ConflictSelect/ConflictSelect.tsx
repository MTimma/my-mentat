import React, { useState } from 'react';
import { ConflictCard } from '../../types/GameTypes';
import { conflictCardImageSrc } from '../../data/boardMarkerAnchors';
import { usePlayBoardModalPortal } from '../../hooks/usePlayBoardModalPortal';
import './ConflictSelect.css';

interface ConflictSelectProps {
  conflicts: ConflictCard[];
  currentRound: number;
  handleConflictSelect: (conflictId: number) => void;
  /** Optional close without selecting (sandbox setup). */
  onCancel?: () => void;
  title?: string;
}

const ConflictSelect: React.FC<ConflictSelectProps> = ({ conflicts, currentRound, handleConflictSelect, onCancel, title }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [failedCardImages, setFailedCardImages] = useState<Set<number>>(new Set());
  const { portalNode, scopedClass, waitForBoardTarget } = usePlayBoardModalPortal(true);

  if (waitForBoardTarget) return null;

  const overlay = (
    <div className={['conflict-select-overlay', scopedClass].filter(Boolean).join(' ')}>
      <div className="conflict-select-dialog">
        <div className="conflict-cards-grid">
          {conflicts.map(card => {
            const cardImageSrc = conflictCardImageSrc(card.id);
            const showCardImage = Boolean(cardImageSrc && !failedCardImages.has(card.id));
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
                    onError={() => setFailedCardImages(prev => new Set(prev).add(card.id))}
                  />
                ) : (
                  <span className="conflict-card-fallback">{card.name}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="conflict-select-actions">
          <h2 className="conflict-select-title">{title ?? `Select Conflict Card - Round ${currentRound}`}</h2>
          {onCancel && (
            <button type="button" className="conflict-select-cancel" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button
            onClick={() => selectedId !== null && handleConflictSelect(selectedId)}
            disabled={selectedId === null}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );

  return portalNode(overlay);
};

export default ConflictSelect; 