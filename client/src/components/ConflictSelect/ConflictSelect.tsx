import React, { useState } from 'react';
import { ConflictCard, RewardType } from '../../types/GameTypes';
import { getRewardIcon, getRewardDisplayName } from '../../utils/rewardIcons';
import './ConflictSelect.css';

interface ConflictSelectProps {
  conflicts: ConflictCard[];
  handleConflictSelect: (conflictId: number) => void;
}

const ConflictSelect: React.FC<ConflictSelectProps> = ({ conflicts, handleConflictSelect }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [failedIconTypes, setFailedIconTypes] = useState<Set<RewardType>>(new Set());

  const renderRewards = (rewards: { type: RewardType; amount: number }[]) => {
    return (
      <ul className="conflict-rewards-list">
        {rewards.map((r, i) => {
          const iconPath = getRewardIcon(r.type);
          const label = getRewardDisplayName(r.type);
          const useText = !iconPath || failedIconTypes.has(r.type);
          return (
            <li key={i} className="conflict-reward-item">
              {useText ? (
                <>
                  <span className="conflict-reward-label">{label}</span>
                  <span className="conflict-reward-amount">{r.amount}</span>
                </>
              ) : (
                <>
                  <img
                    src={`/${iconPath}`}
                    alt=""
                    className="conflict-reward-icon"
                    aria-hidden
                    onError={() => setFailedIconTypes(prev => new Set(prev).add(r.type))}
                  />
                  <span className="conflict-reward-amount">{r.amount}</span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

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