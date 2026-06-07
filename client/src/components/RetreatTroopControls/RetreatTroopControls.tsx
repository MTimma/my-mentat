import React from 'react'
import './RetreatTroopControls.css'

export interface RetreatTroopControlsProps {
  effectRetreatRemaining: number
  troopsInConflict: number
  onRetreat: () => void
  className?: string
  style?: React.CSSProperties
}

const RetreatTroopControls: React.FC<RetreatTroopControlsProps> = ({
  effectRetreatRemaining,
  troopsInConflict,
  onRetreat,
  className,
  style,
}) => {
  const visible = effectRetreatRemaining > 0 && troopsInConflict > 0

  if (!visible) return null

  return (
    <div
      className={['effect-retreat-troop-controls', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
      aria-label="Retreat troops from the Conflict using card or ability allowance"
    >
      <div
        className="troop-action-status troop-action-status--conflict"
        aria-label={`${troopsInConflict} troops in the Conflict`}
      >
        <img src="/icon/troop.png" alt="" className="troop-action-icon" />
        <span className="troop-deployed-count">{troopsInConflict}</span>
      </div>
      <button
        type="button"
        className="troop-action-button troop-retreat-button"
        onClick={onRetreat}
        disabled={effectRetreatRemaining <= 0 || troopsInConflict <= 0}
        aria-label={`Retreat one troop. ${effectRetreatRemaining} retreats remaining.`}
        title={`Retreat troop (${effectRetreatRemaining} remaining)`}
      >
        <span className="troop-available-count">{effectRetreatRemaining}</span>
        <span className="troop-action-arrow" aria-hidden="true">
          ◄
        </span>
      </button>
    </div>
  )
}

export default RetreatTroopControls
