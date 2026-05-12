import React, { useState } from 'react';
import { ConflictCard } from '../../types/GameTypes';
import { conflictCardImageSrc } from '../../data/boardMarkerAnchors';
import './ConflictSelect.css';

interface ConflictSelectProps {
  conflicts: ConflictCard[];
  currentRound: number;
  handleConflictSelect: (conflictId: number) => void;
}

const ConflictSelect: React.FC<ConflictSelectProps> = ({ conflicts, currentRound, handleConflictSelect }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [failedCardImages, setFailedCardImages] = useState<Set<number>>(new Set());

  return (
    <div className="conflict-select-overlay">
      <div className="conflict-select-dialog">
        <div className="conflict-select-header">
          <h2>Select Conflict Card - Round {currentRound}</h2>
        </div>
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
};

export default ConflictSelect; 