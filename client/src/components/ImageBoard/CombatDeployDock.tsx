import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import CombatTroopControls from '../CombatTroopControls/CombatTroopControls'
import type {
  CombatDreadnoughtDeployProps,
  CombatNegotiatorDeployProps,
  CombatTroopDeployProps,
} from './CombatAreaCluster'

export interface CombatDeployDockProps {
  troopDeploy?: CombatTroopDeployProps
  dreadnoughtDeploy?: CombatDreadnoughtDeployProps
  negotiatorDeploy?: CombatNegotiatorDeployProps
  activePlayerId: number
  activePlayerColor?: PlayerColor
  className?: string
  style?: React.CSSProperties
}

const CombatDeployDock: React.FC<CombatDeployDockProps> = ({
  troopDeploy,
  dreadnoughtDeploy,
  negotiatorDeploy,
  activePlayerId,
  activePlayerColor,
  className,
  style,
}) => {
  const deployStripVisible = Boolean(
    (troopDeploy &&
      troopDeploy.canDeploy &&
      ((troopDeploy.deployableTroops > 0 && troopDeploy.garrisonTroops > 0) ||
        troopDeploy.deployedThisTurn > 0)) ||
    (dreadnoughtDeploy &&
      dreadnoughtDeploy.canDeploy &&
      ((dreadnoughtDeploy.deployableDreadnoughts > 0 &&
        dreadnoughtDeploy.garrisonDreadnoughts > 0) ||
        dreadnoughtDeploy.deployedThisTurn > 0)) ||
    (negotiatorDeploy &&
      negotiatorDeploy.canDeploy &&
      ((negotiatorDeploy.deployableNegotiators > 0 && negotiatorDeploy.negotiatorsOnIx > 0) ||
        negotiatorDeploy.deployedThisTurn > 0))
  )

  if (!troopDeploy && !dreadnoughtDeploy && !negotiatorDeploy) return null

  return (
    <div
      className={className}
      style={style}
      data-marker="combat-troop-controls"
    >
      <div className="combat-deploy-dock" hidden={!deployStripVisible}>
        {troopDeploy ? (
          <CombatTroopControls
            {...troopDeploy}
            playerColor={activePlayerColor}
            className="combat-deploy-dock__controls"
          />
        ) : null}
        {dreadnoughtDeploy ? (
          <CombatTroopControls
            variant="dreadnought"
            playerId={activePlayerId}
            playerColor={activePlayerColor}
            canDeploy={dreadnoughtDeploy.canDeploy}
            deployableTroops={dreadnoughtDeploy.deployableDreadnoughts}
            deployedThisTurn={dreadnoughtDeploy.deployedThisTurn}
            garrisonTroops={dreadnoughtDeploy.garrisonDreadnoughts}
            onDeploy={dreadnoughtDeploy.onDeploy}
            onUndeploy={dreadnoughtDeploy.onUndeploy}
            className="combat-deploy-dock__controls combat-deploy-dock__controls--dreadnought"
          />
        ) : null}
        {negotiatorDeploy ? (
          <CombatTroopControls
            variant="negotiator"
            playerId={activePlayerId}
            playerColor={activePlayerColor}
            canDeploy={negotiatorDeploy.canDeploy}
            deployableTroops={negotiatorDeploy.deployableNegotiators}
            deployedThisTurn={negotiatorDeploy.deployedThisTurn}
            garrisonTroops={negotiatorDeploy.negotiatorsOnIx}
            onDeploy={negotiatorDeploy.onDeploy}
            onUndeploy={negotiatorDeploy.onUndeploy}
            className="combat-deploy-dock__controls combat-deploy-dock__controls--negotiator"
          />
        ) : null}
      </div>
    </div>
  )
}

export default CombatDeployDock
