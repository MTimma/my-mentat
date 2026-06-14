import React, { useMemo, useState, type RefObject } from 'react'
import { GameState, PlayerColor, type Player } from '../../types/GameTypes'
import { getLeaderImage } from '../../data/leaders'
import CombatPlayerDetailModal from './CombatPlayerDetailModal'
import { PlayerCombatSlot } from './CombatStatusStrip'
import CombatTroopControls from '../CombatTroopControls/CombatTroopControls'

type ResourceDef = {
  icon: string
  title: string
  getValue: (player: Player) => number
}

/** 3 cols × 2 rows: spice/solari/water, troops/cards/intrigue. */
const RESOURCE_CELLS: ResourceDef[] = [
  { icon: '/icon/spice.png', title: 'Spice', getValue: player => player.spice },
  { icon: '/icon/solari.png', title: 'Solari', getValue: player => player.solari },
  { icon: '/icon/water.png', title: 'Water', getValue: player => player.water },
  { icon: '/icon/troop.png', title: 'Garrison troops', getValue: player => player.troops },
  { icon: '/icon/draw.png', title: 'Cards in hand', getValue: player => player.handCount },
  { icon: '/icon/intrigue.png', title: 'Intrigue cards', getValue: player => player.intrigueCount },
]

/** Left / right columns: red+blue, green+yellow — stats sit under each leader. */
const COMBAT_AREA_COLUMNS: PlayerColor[][] = [
  [PlayerColor.RED, PlayerColor.BLUE],
  [PlayerColor.GREEN, PlayerColor.YELLOW],
]

function renderResourceCell(resource: ResourceDef, player: Player) {
  return (
    <span
      key={resource.title}
      className="combat-area-cluster__resource"
      title={resource.title}
    >
      <img
        src={resource.icon}
        alt=""
        className="combat-area-cluster__icon"
        aria-hidden="true"
      />
      <span className="combat-area-cluster__value">{resource.getValue(player)}</span>
    </span>
  )
}

function ResourceGrid({ player }: { player: Player }) {
  return (
    <div className="combat-area-cluster__resources-panel">
      <div className="combat-area-cluster__resources">
        {RESOURCE_CELLS.map(resource => renderResourceCell(resource, player))}
      </div>
    </div>
  )
}

function LeaderPortrait({ player }: { player: Player }) {
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
    </div>
  )
}

function PlayerQuadrant({
  player,
  isActive,
  onSelect,
}: {
  player: Player
  isActive: boolean
  onSelect: () => void
}) {
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
      title={`${player.leader.name}: view details`}
      aria-label={`${player.leader.name}. View player details.`}
      onClick={onSelect}
    >
      <LeaderPortrait player={player} />
      <div className="combat-area-cluster__quadrant-body">
        <ResourceGrid player={player} />
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

export interface CombatAreaClusterProps {
  players: Player[]
  troops: Record<number, number>
  strength: Record<number, number>
  activePlayerId: number
  gameState?: GameState
  modalContainerRef?: RefObject<HTMLElement | null>
  troopDeploy?: CombatTroopDeployProps
  /** Inner-board % height of leader grid; status rows are included inside the cluster. */
  gridHeightPercent?: number
  /** Overrides quadrant click (sandbox setup opens the player editor instead of the detail modal). */
  onPlayerSelect?: (player: Player) => void
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
  gridHeightPercent,
  onPlayerSelect,
  className,
  style,
  'data-marker': dataMarker,
}) => {
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null)
  const playerByColor = new Map(players.map(p => [p.color, p]))

  const deployStripVisible = Boolean(
    troopDeploy &&
      troopDeploy.canDeploy &&
      ((troopDeploy.deployableTroops > 0 && troopDeploy.garrisonTroops > 0) ||
        troopDeploy.deployedThisTurn > 0)
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
                        onSelect={() =>
                          onPlayerSelect ? onPlayerSelect(player) : setDetailPlayer(player)
                        }
                      />
                      <PlayerCombatSlot
                        player={player}
                        troops={troops[player.id] ?? 0}
                        strength={strength[player.id] ?? 0}
                        isActive={player.id === activePlayerId}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          {troopDeploy ? (
            <div
              className="combat-deploy-dock"
              data-marker="combat-troop-controls"
              hidden={!deployStripVisible}
            >
              <CombatTroopControls
                {...troopDeploy}
                className="combat-deploy-dock__controls"
              />
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
