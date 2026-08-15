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
  const shortLabel = isDreadnought ? 'Dread' : isSpecimen ? 'Specimen' : 'Troop'
  const iconSrc = '/icon/troop.png'

  const visible =
    canDeploy &&
    ((deployableTroops > 0 && garrisonTroops > 0) || deployedThisTurn > 0)

  if (!visible) return null

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
      <span className="troop-action-unit-label">{shortLabel}</span>
      <div className="troop-action-row">
        <button
          type="button"
          className="troop-action-button troop-deploy-button"
          onClick={onDeploy}
          disabled={!canDeploy || garrisonTroops <= 0 || deployableTroops <= 0}
          aria-label={`Deploy one ${unitLabel}. ${deployableTroops} available to deploy.`}
          title={`Deploy ${unitLabel} (${deployableTroops} available)`}
        >
          <span className="troop-action-glyphs">
            <span className="troop-available-count">{deployableTroops}</span>
            {isDreadnought ? (
              <DreadnoughtIcon
                playerId={playerId}
                color={playerColor}
                className="troop-action-icon troop-action-icon--dreadnought"
              />
            ) : isSpecimen ? (
              <img
                src="/icon/specimen.png"
                alt=""
                className="troop-action-icon troop-action-icon--specimen"
              />
            ) : (
              <img src={iconSrc} alt="" className="troop-action-icon" />
            )}
            <span className="troop-action-arrow" aria-hidden="true">
              ➤
            </span>
          </span>
          <span className="troop-action-btn-text">Deploy</span>
        </button>
        <div
          className="troop-action-status"
          aria-label={`${deployedThisTurn} ${unitLabel}s deployed this turn`}
        >
          <span className="troop-deployed-count">{deployedThisTurn}</span>
          <span className="troop-action-status-label" aria-hidden="true">
            sent
          </span>
        </div>
        <button
          type="button"
          className="troop-action-button troop-undeploy-button"
          onClick={onUndeploy}
          disabled={!canDeploy || deployedThisTurn <= 0}
          aria-label={`Undo one deployment. ${deployedThisTurn} can be taken back.`}
          title={`Undo deploy (${deployedThisTurn} deployed this turn)`}
        >
          <span className="troop-action-glyphs">
            <span className="troop-action-arrow" aria-hidden="true">
              ◄
            </span>
          </span>
          <span className="troop-action-btn-text">Undo</span>
        </button>
      </div>
    </div>
  )
}

export default CombatTroopControls
