import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import CombatTroopControls from '../CombatTroopControls/CombatTroopControls'
import type {
  CombatDreadnoughtDeployProps,
  CombatSpecimenDeployProps,
  CombatTroopDeployProps,
} from './CombatAreaCluster'

export interface CombatDeployDockProps {
  troopDeploy?: CombatTroopDeployProps
  dreadnoughtDeploy?: CombatDreadnoughtDeployProps
  specimenDeploy?: CombatSpecimenDeployProps
  activePlayerId: number
  activePlayerColor?: PlayerColor
  className?: string
  style?: React.CSSProperties
}

/** Invented helper name `isCombatDeployDockVisible` — same visibility rule the dock already used. */
export function isCombatDeployDockVisible(
  troopDeploy?: CombatTroopDeployProps,
  dreadnoughtDeploy?: CombatDreadnoughtDeployProps,
  specimenDeploy?: CombatSpecimenDeployProps,
): boolean {
  return Boolean(
    (troopDeploy &&
      troopDeploy.canDeploy &&
      ((troopDeploy.deployableTroops > 0 && troopDeploy.garrisonTroops > 0) ||
        troopDeploy.deployedThisTurn > 0)) ||
    (dreadnoughtDeploy &&
      dreadnoughtDeploy.canDeploy &&
      ((dreadnoughtDeploy.deployableDreadnoughts > 0 &&
        dreadnoughtDeploy.garrisonDreadnoughts > 0) ||
        dreadnoughtDeploy.deployedThisTurn > 0)) ||
    (specimenDeploy &&
      specimenDeploy.canDeploy &&
      ((specimenDeploy.deployableSpecimens > 0 && specimenDeploy.specimensInTanks > 0) ||
        specimenDeploy.deployedThisTurn > 0)),
  )
}

const CombatDeployDock: React.FC<CombatDeployDockProps> = ({
  troopDeploy,
  dreadnoughtDeploy,
  specimenDeploy,
  activePlayerId,
  activePlayerColor,
  className,
  style,
}) => {
  const deployStripVisible = isCombatDeployDockVisible(
    troopDeploy,
    dreadnoughtDeploy,
    specimenDeploy,
  )

  if (!troopDeploy && !dreadnoughtDeploy && !specimenDeploy) return null

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
        {specimenDeploy ? (
          <CombatTroopControls
            variant="specimen"
            playerId={activePlayerId}
            playerColor={activePlayerColor}
            canDeploy={specimenDeploy.canDeploy}
            deployableTroops={specimenDeploy.deployableSpecimens}
            deployedThisTurn={specimenDeploy.deployedThisTurn}
            garrisonTroops={specimenDeploy.specimensInTanks}
            onDeploy={specimenDeploy.onDeploy}
            onUndeploy={specimenDeploy.onUndeploy}
            className="combat-deploy-dock__controls combat-deploy-dock__controls--specimen"
          />
        ) : null}
      </div>
    </div>
  )
}

export default CombatDeployDock
