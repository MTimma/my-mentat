import React from 'react'
import { ConflictCard, Reward } from '../../types/GameTypes'
import './ConflictSummary.css'

interface ConflictSummaryProps {
  currentConflict: ConflictCard
}

function formatRewards(rewards: Reward[] = []) {
  if (!rewards.length) return <span className="no-reward">-</span>
  return rewards.map((r, i) => (
    <span key={i} className={`reward reward-${r.type}`}>{r.amount} {r.type}</span>
  ))
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