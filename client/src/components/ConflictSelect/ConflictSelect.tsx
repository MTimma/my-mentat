import React, { useState } from 'react';
import { ConflictCard, RewardType } from '../../types/GameTypes';
import './ConflictSelect.css';

interface ConflictSelectProps {
  conflicts: ConflictCard[];
  handleConflictSelect: (conflictId: number) => void;
}

function renderRewards(rewards: { type: RewardType; amount: number }[]) {
  return (
    <ul className="conflict-rewards-list">
      {rewards.map((r, i) => (
        <li key={i}>
          {r.amount} {r.type}
        </li>
      ))}
    </ul>
  );
}

const ConflictSelect: React.FC<ConflictSelectProps> = ({ conflicts, handleConflictSelect }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  return (
    <div className="conflict-select-overlay">
      <div className="conflict-select-dialog">
        <div className="conflict-select-header">
          <h2>Select Conflict Card</h2>
        </div>
        <div className="conflict-cards-grid">
          {conflicts.map(card => (
            <div
              key={card.id}
              className={`conflict-card${selectedId === card.id ? ' selected' : ''}`}
              onClick={() => setSelectedId(card.id)}
              tabIndex={0}
              aria-pressed={selectedId === card.id}
              role="button"
            >
              <div className="conflict-card-header">
                <span className="conflict-card-tier">Tier {card.tier}</span>
                <h3>{card.name}</h3>
              </div>
              <div className="conflict-card-rewards">
                <div><strong>1st:</strong> {renderRewards(card.rewards.first)}</div>
                <div><strong>2nd:</strong> {renderRewards(card.rewards.second)}</div>
                <div><strong>3rd:</strong> {renderRewards(card.rewards.third)}</div>
              </div>
            </div>
          ))}
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