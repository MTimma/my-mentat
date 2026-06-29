import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import NegotiatorIcon from '../NegotiatorIcon/NegotiatorIcon'
import './CombatTroopControls.css'

export interface CombatTroopControlsProps {
  canDeploy: boolean
  deployableTroops: number
  deployedThisTurn: number
  garrisonTroops: number
  onDeploy: () => void
  onUndeploy: () => void
  variant?: 'troop' | 'dreadnought' | 'negotiator'
  playerId?: number
  playerColor?: PlayerColor
  className?: string
  style?: React.CSSProperties
}

const CombatTroopControls: React.FC<CombatTroopControlsProps> = ({
  canDeploy,
  deployableTroops,
  deployedThisTurn,
  garrisonTroops,
  onDeploy,
  onUndeploy,
  variant = 'troop',
  playerId = 0,
  playerColor,
  className,
  style,
}) => {
  const isDreadnought = variant === 'dreadnought'
  const isNegotiator = variant === 'negotiator'
  const unitLabel = isDreadnought ? 'dreadnought' : isNegotiator ? 'negotiator' : 'troop'
  const iconSrc = '/icon/troop.png'

  const visible =
    canDeploy &&
    ((deployableTroops > 0 && garrisonTroops > 0) || deployedThisTurn > 0)

  if (!visible) return null

  return (
    <div
      className={['combat-troop-controls', className].filter(Boolean).join(' ')}
      style={style}
      role="group"
      aria-label={`Deploy or undo deployment of ${unitLabel}s to the Conflict`}
    >
      <button
        type="button"
        className="troop-action-button troop-deploy-button"
        onClick={onDeploy}
        disabled={!canDeploy || garrisonTroops <= 0 || deployableTroops <= 0}
        aria-label={`Deploy one ${unitLabel}. ${deployableTroops} available to deploy.`}
        title={`Deploy ${unitLabel} (${deployableTroops} available)`}
      >
        <span className="troop-available-count">{deployableTroops}</span>
        {isDreadnought ? (
          <DreadnoughtIcon
            playerId={playerId}
            color={playerColor}
            className="troop-action-icon troop-action-icon--dreadnought"
          />
        ) : isNegotiator ? (
          <NegotiatorIcon
            playerId={playerId}
            color={playerColor}
            className="troop-action-icon troop-action-icon--negotiator"
          />
        ) : (
          <img src={iconSrc} alt="" className="troop-action-icon" />
        )}
        <span className="troop-action-arrow" aria-hidden="true">
          ➤
        </span>
      </button>
      <div
        className="troop-action-status"
        aria-label={`${deployedThisTurn} ${unitLabel}s deployed this turn`}
      >
        <span className="troop-deployed-count">{deployedThisTurn}</span>
      </div>
      <button
        type="button"
        className="troop-action-button troop-undeploy-button"
        onClick={onUndeploy}
        disabled={!canDeploy || deployedThisTurn <= 0}
        aria-label={`Undo one deployment. ${deployedThisTurn} can be taken back.`}
        title={`Undo deploy (${deployedThisTurn} deployed this turn)`}
      >
        <span className="troop-action-arrow" aria-hidden="true">
          ◄
        </span>
      </button>
    </div>
  )
}

export default CombatTroopControls
