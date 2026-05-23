import React from 'react'
import './CombatTroopControls.css'

export interface CombatTroopControlsProps {
  canDeploy: boolean
  deployableTroops: number
  retreatableTroops: number
  garrisonTroops: number
  onDeploy: () => void
  onRetreat: () => void
  className?: string
  style?: React.CSSProperties
}

const CombatTroopControls: React.FC<CombatTroopControlsProps> = ({
  canDeploy,
  deployableTroops,
  retreatableTroops,
  garrisonTroops,
  onDeploy,
  onRetreat,
  className,
  style,
}) => {
  const visible =
    canDeploy &&
    ((deployableTroops > 0 && garrisonTroops > 0) || retreatableTroops > 0)

  if (!visible) return null

  return (
    <div
      className={['combat-troop-controls', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
      aria-label="Deploy or retreat troops in the Conflict"
    >
      <button
        type="button"
        className="troop-action-button troop-deploy-button"
        onClick={onDeploy}
        disabled={!canDeploy || garrisonTroops <= 0 || deployableTroops <= 0}
        aria-label={`Deploy one troop. ${deployableTroops} available to deploy.`}
        title={`Deploy troop (${deployableTroops} available)`}
      >
        <span className="troop-available-count">{deployableTroops}</span>
        <img src="/icon/troop.png" alt="" className="troop-action-icon" />
        <span className="troop-action-arrow" aria-hidden="true">
          ➤
        </span>
      </button>
      <div className="troop-action-status" aria-label={`${retreatableTroops} troops deployed this turn`}>
        <span className="troop-deployed-count">{retreatableTroops}</span>
      </div>
      <button
        type="button"
        className="troop-action-button troop-retreat-button"
        onClick={onRetreat}
        disabled={!canDeploy || retreatableTroops <= 0}
        aria-label={`Retreat one troop. ${retreatableTroops} can retreat.`}
        title={`Retreat troop (${retreatableTroops} available)`}
      >
        <span className="troop-action-arrow" aria-hidden="true">
          ◄
        </span>
      </button>
    </div>
  )
}

export default CombatTroopControls
