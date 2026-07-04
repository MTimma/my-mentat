import React, { useMemo, useState, type RefObject } from 'react'
import { GameState, type Player } from '../../types/GameTypes'
import { COMBAT_AREA_SEATS } from '../../data/boardMarkerAnchors'
import { getLeaderImage } from '../../data/leaders'
import { isTessiaLeader } from '../../data/leaderAbilities/tessiaSnoopers'
import AgentIcon from '../AgentIcon/AgentIcon'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import TessiaLeaderOverlays from '../TessiaLeaderOverlays/TessiaLeaderOverlays'
import CombatPlayerDetailModal from './CombatPlayerDetailModal'
import { PlayerCombatSlot } from './CombatStatusStrip'

type ResourceDef = {
  key: string
  title: string
  icon?: string
  renderIcon?: (player: Player) => React.ReactNode
  getValue: (player: Player) => number
}

function resourceCellsFor(riseOfIx: boolean): ResourceDef[] {
  return [
    { key: 'spice', title: 'Spice', icon: '/icon/spice.png', getValue: player => player.spice },
    { key: 'solari', title: 'Solari', icon: '/icon/solari.png', getValue: player => player.solari },
    { key: 'water', title: 'Water', icon: '/icon/water.png', getValue: player => player.water },
    {
      key: 'agents',
      title: 'Agents remaining',
      renderIcon: player => (
        <AgentIcon playerId={player.id} color={player.color} className="combat-area-cluster__agent-icon" />
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
      renderIcon: player => (
        <DreadnoughtIcon
          playerId={player.id}
          color={player.color}
          className="combat-area-cluster__icon combat-area-cluster__icon--dreadnought"
        />
      ),
      getValue: player => (riseOfIx ? player.dreadnoughts?.garrison ?? 0 : 0),
    },
  ]
}

/** Left / right columns: P1+P4, P2+P3 — stats sit under each leader. Seat order is by player id. */
const COMBAT_AREA_COLUMNS = COMBAT_AREA_SEATS

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
}: {
  player: Player
  riseOfIx: boolean
}) {
  const cells = useMemo(() => resourceCellsFor(riseOfIx), [riseOfIx])
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
        isTessiaLeader(player.leader) ? 'combat-area-cluster__leader--tessia' : '',
      ].join(' ')}
      aria-hidden="true"
    >
      <img
        src={leaderImage}
        alt=""
        className="combat-area-cluster__leader-img"
        draggable={false}
      />
      <TessiaLeaderOverlays leader={player.leader} />
      {isFirstPlayer ? (
        <img
          src="/icon/first_player.png"
          alt=""
          className="combat-area-cluster__first-player-badge"
          title="First player"
          draggable={false}
        />
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
  onSelect,
}: {
  player: Player
  isActive: boolean
  isFirstPlayer: boolean
  hasMentat: boolean
  riseOfIx: boolean
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
          <img
            src="/icon/mentat.png"
            alt=""
            className="combat-area-cluster__mentat-badge"
            title="Mentat (this round)"
            draggable={false}
          />
        ) : null}
        <ResourceGrid player={player} riseOfIx={riseOfIx} />
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
  const playerById = new Map(players.map(p => [p.id, p]))

  const outerStyle = useMemo(() => {
    if (gridHeightPercent == null) return style
    return {
      ...style,
      height: `calc(${gridHeightPercent}% + var(--combat-status-strip-height, 4.3em))`,
    }
  }, [gridHeightPercent, style])

  return (
    <>
      <div
        className={className}
        style={outerStyle}
        data-marker={dataMarker}
      >
        <div className="combat-area-cluster-stack">
          <div className="combat-area-cluster combat-area-cluster--with-status-inline">
            {COMBAT_AREA_COLUMNS.map((columnPlayerIds, columnIndex) => (
              <div key={columnIndex} className="combat-area-cluster__column">
                {columnPlayerIds.map(playerId => {
                  const player = playerById.get(playerId)
                  if (!player) return null

                  return (
                    <div
                      key={playerId}
                      className={[
                        'combat-area-cluster__seat',
                        `combat-area-cluster__seat--${player.color}`,
                      ].join(' ')}
                    >
                      <PlayerQuadrant
                        player={player}
                        isActive={player.id === activePlayerId}
                        isFirstPlayer={player.id === firstPlayerMarker}
                        hasMentat={player.id === mentatOwner}
                        riseOfIx={riseOfIx}
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
