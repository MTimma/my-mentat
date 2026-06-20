import React, { useMemo, useState, type RefObject } from 'react'
import { GameState, PlayerColor, type Player } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import AgentIcon from '../AgentIcon/AgentIcon'
import CombatPlayerDetailModal from './CombatPlayerDetailModal'
import { PlayerCombatSlot } from './CombatStatusStrip'
import CombatTroopControls from '../CombatTroopControls/CombatTroopControls'

type ResourceDef = {
  key: string
  title: string
  icon?: string
  renderIcon?: (player: Player) => React.ReactNode
  getValue: (player: Player) => number
}

function resourceCellsFor(riseOfIx: boolean, gameState?: GameState): ResourceDef[] {
  return [
    {
      key: 'vp',
      title: 'Victory points',
      icon: '/icon/vp.png',
      getValue: player =>
        gameState ? getTotalVictoryPoints(player, gameState) : player.victoryPoints,
    },
    { key: 'spice', title: 'Spice', icon: '/icon/spice.png', getValue: player => player.spice },
    { key: 'solari', title: 'Solari', icon: '/icon/solari.png', getValue: player => player.solari },
    { key: 'water', title: 'Water', icon: '/icon/water.png', getValue: player => player.water },
    {
      key: 'agents',
      title: 'Agents remaining',
      renderIcon: player => (
        <AgentIcon playerId={player.id} className="combat-area-cluster__agent-icon" />
      ),
      getValue: player => player.agents,
    },
    { key: 'hand', title: 'Cards in hand', icon: '/icon/draw.png', getValue: player => player.handCount },
    {
      key: 'intrigue',
      title: 'Intrigue cards',
      icon: '/icon/intrigue.png',
      getValue: player => player.intrigueCount,
    },
    { key: 'troops', title: 'Garrison troops', icon: '/icon/troop.png', getValue: player => player.troops },
    {
      key: 'dreadnoughts',
      title: 'Dreadnoughts in garrison',
      icon: '/icon/dreadnought.svg',
      getValue: player => (riseOfIx ? player.dreadnoughts?.garrison ?? 0 : 0),
    },
  ]
}

/** Left / right columns: red+blue, green+yellow — stats sit under each leader. */
const COMBAT_AREA_COLUMNS: PlayerColor[][] = [
  [PlayerColor.RED, PlayerColor.BLUE],
  [PlayerColor.GREEN, PlayerColor.YELLOW],
]

function renderResourceCell(resource: ResourceDef, player: Player) {
  return (
    <span
      key={resource.key}
      className="combat-area-cluster__resource"
      title={resource.title}
    >
      {resource.renderIcon ? (
        <span className="combat-area-cluster__icon-wrap" aria-hidden="true">
          {resource.renderIcon(player)}
        </span>
      ) : resource.icon ? (
        <img
          src={resource.icon}
          alt=""
          className={[
            'combat-area-cluster__icon',
            resource.key === 'dreadnoughts' ? 'combat-area-cluster__icon--dreadnought' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        />
      ) : null}
      <span className="combat-area-cluster__value">{resource.getValue(player)}</span>
    </span>
  )
}

function ResourceGrid({
  player,
  riseOfIx,
  gameState,
}: {
  player: Player
  riseOfIx: boolean
  gameState?: GameState
}) {
  const cells = useMemo(() => resourceCellsFor(riseOfIx, gameState), [riseOfIx, gameState])
  return (
    <div className="combat-area-cluster__resources-panel">
      <div
        className={[
          'combat-area-cluster__resources',
          riseOfIx ? 'combat-area-cluster__resources--rise-of-ix' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {cells.map(resource => renderResourceCell(resource, player))}
      </div>
    </div>
  )
}

function LeaderPortrait({
  player,
  isFirstPlayer,
}: {
  player: Player
  isFirstPlayer: boolean
}) {
  const leaderImage = getLeaderImage(player.leader.name)
  if (!leaderImage) return null

  return (
    <div
      className={[
        'combat-area-cluster__leader',
        `combat-area-cluster__leader--${player.color}`,
      ].join(' ')}
      aria-hidden="true"
    >
      <img
        src={leaderImage}
        alt=""
        className="combat-area-cluster__leader-img"
        draggable={false}
      />
      {isFirstPlayer ? (
        <span className="combat-area-cluster__first-player-badge" title="First player">
          FP
        </span>
      ) : null}
    </div>
  )
}

function PlayerQuadrant({
  player,
  isActive,
  isFirstPlayer,
  hasMentat,
  riseOfIx,
  gameState,
  onSelect,
}: {
  player: Player
  isActive: boolean
  isFirstPlayer: boolean
  hasMentat: boolean
  riseOfIx: boolean
  gameState?: GameState
  onSelect: () => void
}) {
  const mentatSuffix = hasMentat ? ', mentat holder' : ''
  const firstPlayerSuffix = isFirstPlayer ? ' (first player)' : ''

  return (
    <button
      type="button"
      className={[
        'combat-area-cluster__quadrant',
        `combat-area-cluster__quadrant--${player.color}`,
        isActive ? 'combat-area-cluster__quadrant--active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      data-player-id={player.id}
      title={`${player.leader.name}${firstPlayerSuffix}${mentatSuffix}: view details`}
      aria-label={`${player.leader.name}${firstPlayerSuffix}${mentatSuffix}. View player details.`}
      onClick={onSelect}
    >
      <LeaderPortrait player={player} isFirstPlayer={isFirstPlayer} />
      <div className="combat-area-cluster__quadrant-body">
        {hasMentat ? (
          <span className="combat-area-cluster__mentat-badge" title="Mentat (this round)">
            M
          </span>
        ) : null}
        <ResourceGrid player={player} riseOfIx={riseOfIx} gameState={gameState} />
      </div>
    </button>
  )
}

export interface CombatTroopDeployProps {
  canDeploy: boolean
  deployableTroops: number
  deployedThisTurn: number
  garrisonTroops: number
  onDeploy: () => void
  onUndeploy: () => void
}

export interface CombatDreadnoughtDeployProps {
  canDeploy: boolean
  deployableDreadnoughts: number
  deployedThisTurn: number
  garrisonDreadnoughts: number
  onDeploy: () => void
  onUndeploy: () => void
}

export interface CombatNegotiatorDeployProps {
  canDeploy: boolean
  deployableNegotiators: number
  deployedThisTurn: number
  negotiatorsOnIx: number
  onDeploy: () => void
  onUndeploy: () => void
}

export interface CombatAreaClusterProps {
  players: Player[]
  troops: Record<number, number>
  strength: Record<number, number>
  activePlayerId: number
  gameState?: GameState
  modalContainerRef?: RefObject<HTMLElement | null>
  troopDeploy?: CombatTroopDeployProps
  dreadnoughtDeploy?: CombatDreadnoughtDeployProps
  negotiatorDeploy?: CombatNegotiatorDeployProps
  /** Inner-board % height of leader grid; status rows are included inside the cluster. */
  gridHeightPercent?: number
  /** Overrides quadrant click (sandbox setup opens the player editor instead of the detail modal). */
  onPlayerSelect?: (player: Player) => void
  riseOfIx?: boolean
  firstPlayerMarker?: number
  mentatOwner?: number | null
  className?: string
  style?: React.CSSProperties
  'data-marker'?: string
}

const CombatAreaCluster: React.FC<CombatAreaClusterProps> = ({
  players,
  troops,
  strength,
  activePlayerId,
  gameState,
  modalContainerRef,
  troopDeploy,
  dreadnoughtDeploy,
  negotiatorDeploy,
  gridHeightPercent,
  onPlayerSelect,
  riseOfIx = false,
  firstPlayerMarker = 0,
  mentatOwner = null,
  className,
  style,
  'data-marker': dataMarker,
}) => {
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null)
  const playerByColor = new Map(players.map(p => [p.color, p]))

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

  const outerStyle = useMemo(() => {
    if (gridHeightPercent == null) return style
    const deployExtra = deployStripVisible
      ? ' + var(--combat-deploy-dock-height, 3.5em)'
      : ''
    return {
      ...style,
      height: `calc(${gridHeightPercent}% + var(--combat-status-strip-height, 4.3em)${deployExtra})`,
    }
  }, [deployStripVisible, gridHeightPercent, style])

  return (
    <>
      <div
        className={className}
        style={outerStyle}
        data-marker={dataMarker}
      >
        <div className="combat-area-cluster-stack">
          <div className="combat-area-cluster combat-area-cluster--with-status-inline">
            {COMBAT_AREA_COLUMNS.map((columnColors, columnIndex) => (
              <div key={columnIndex} className="combat-area-cluster__column">
                {columnColors.map(color => {
                  const player = playerByColor.get(color)
                  if (!player) return null

                  return (
                    <div
                      key={color}
                      className={[
                        'combat-area-cluster__seat',
                        `combat-area-cluster__seat--${color}`,
                      ].join(' ')}
                    >
                      <PlayerQuadrant
                        player={player}
                        isActive={player.id === activePlayerId}
                        isFirstPlayer={player.id === firstPlayerMarker}
                        hasMentat={player.id === mentatOwner}
                        riseOfIx={riseOfIx}
                        gameState={gameState}
                        onSelect={() =>
                          onPlayerSelect ? onPlayerSelect(player) : setDetailPlayer(player)
                        }
                      />
                      <PlayerCombatSlot
                        player={player}
                        troops={troops[player.id] ?? 0}
                        strength={strength[player.id] ?? 0}
                        isActive={player.id === activePlayerId}
                        riseOfIx={riseOfIx}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {(troopDeploy || dreadnoughtDeploy) ? (
            <div
              className="combat-deploy-dock"
              data-marker="combat-troop-controls"
              hidden={!deployStripVisible}
            >
              {troopDeploy ? (
                <CombatTroopControls
                  {...troopDeploy}
                  className="combat-deploy-dock__controls"
                />
              ) : null}
              {dreadnoughtDeploy ? (
                <CombatTroopControls
                  variant="dreadnought"
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
          ) : null}
        </div>
      </div>

      {detailPlayer && (
        <CombatPlayerDetailModal
          player={detailPlayer}
          gameState={gameState}
          containerRef={modalContainerRef}
          onClose={() => setDetailPlayer(null)}
        />
      )}
    </>
  )
}

export default CombatAreaCluster
