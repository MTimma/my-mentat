import React from 'react'
import { ConflictCard, ConflictReward, RewardType } from '../../types/GameTypes'
import './ConflictSummary.css'

interface ConflictSummaryProps {
  currentConflict: ConflictCard
}

function formatRewards(rewards: ConflictReward[] = []) {
  if (!rewards.length) return <span className="no-reward">-</span>
  return rewards.map((r, i) => {
    if (r.choiceOptions && r.choiceOptions.length > 0) {
      return (
        <span key={i} className="reward reward-choice">
          Choose one: {r.choiceOptions.map((opt, j) => (
            <React.Fragment key={j}>
              {j > 0 && ' or '}
              {opt.amount} {opt.type}
            </React.Fragment>
          ))}
        </span>
      )
    }
    if (r.chooseFaction && r.type === RewardType.INFLUENCE) {
      return (
        <span key={i} className="reward reward-influence">
          {r.amount} Influence (choose faction)
        </span>
      )
    }
    return (
      <span key={i} className={`reward reward-${r.type}`}>{r.amount} {r.type}</span>
    )
  })
}

const ConflictSummary: React.FC<ConflictSummaryProps> = ({ currentConflict }) => {
  return (
    <div className="conflict-summary">
      <div className="conflict-title">Current Conflict: <span className="conflict-name">{currentConflict.name}</span></div>
      <div className="conflict-rewards">
        <div className="first-place"><span className="place">1st:</span> {formatRewards(currentConflict.rewards.first)}</div>
        <div className="second-place"><span className="place">2nd:</span> {formatRewards(currentConflict.rewards.second)}</div>
        <div className="third-place"><span className="place">3rd:</span> {formatRewards(currentConflict.rewards.third)}</div>
      </div>
    </div>
  )
}

export default ConflictSummary 