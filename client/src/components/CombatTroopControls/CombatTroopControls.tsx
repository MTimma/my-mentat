import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import './CombatTroopControls.css'

export interface CombatTroopControlsProps {
  canDeploy: boolean
  deployableTroops: number
  deployedThisTurn: number
  garrisonTroops: number
  onDeploy: () => void
  onUndeploy: () => void
  variant?: 'troop' | 'dreadnought' | 'specimen'
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
  const isSpecimen = variant === 'specimen'
  const unitLabel = isDreadnought ? 'dreadnought' : isSpecimen ? 'specimen' : 'troop'
  const available = Math.min(deployableTroops, garrisonTroops)

  const visible =
    canDeploy &&
    ((deployableTroops > 0 && garrisonTroops > 0) || deployedThisTurn > 0)

  if (!visible) return null

  const sourceIcon = isDreadnought ? (
    <DreadnoughtIcon
      playerId={playerId}
      color={playerColor}
      className="troop-action-icon troop-action-icon--dreadnought"
    />
  ) : (
    <img
      src={isSpecimen ? '/icon/specimen.png' : '/icon/troop.png'}
      alt=""
      className={[
        'troop-action-icon',
        isSpecimen ? 'troop-action-icon--specimen' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  )

  return (
    <div
      className={[
        'combat-troop-controls',
        `combat-troop-controls--${variant}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={style}
      role="group"
      aria-label={`Deploy or undo deployment of ${unitLabel}s to the Conflict`}
    >
      <button
        type="button"
        className="troop-action-button troop-undeploy-button"
        onClick={onUndeploy}
        disabled={!canDeploy || deployedThisTurn <= 0}
        aria-label={`Return one ${unitLabel} from the Conflict. ${deployedThisTurn} deployed.`}
        title={`${deployedThisTurn} in Conflict`}
      >
        <img src="/icon/deploy.png" alt="" className="troop-action-icon troop-action-icon--deploy" />
        <span className="troop-action-count">{deployedThisTurn}</span>
      </button>
      <button
        type="button"
        className="troop-action-button troop-deploy-button"
        onClick={onDeploy}
        disabled={!canDeploy || available <= 0}
        aria-label={`Deploy one ${unitLabel} to the Conflict. ${available} available.`}
        title={`${available} available`}
      >
        {sourceIcon}
        <span className="troop-action-count">{available}</span>
      </button>
    </div>
  )
}

export default CombatTroopControls
