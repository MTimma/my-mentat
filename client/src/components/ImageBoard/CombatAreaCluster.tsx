import React, { useEffect, useMemo, useState, type RefObject } from 'react'
import { GameState, type Gain, type Player } from '../../types/GameTypes'
import { COMBAT_AREA_SEATS } from '../../data/boardMarkerAnchors'
import { getLeaderImage } from '../../data/leaders'
import { isTessiaLeader } from '../../data/leaderAbilities/tessiaSnoopers'
import AgentIcon from '../AgentIcon/AgentIcon'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import TessiaLeaderOverlays from '../TessiaLeaderOverlays/TessiaLeaderOverlays'
import CombatPlayerDetailModal from './CombatPlayerDetailModal'
import { resolveCardInSnapshot, resolveCardInSnapshotByName } from '../../utils/revealTurnStats'
import {
  BirdseyeDesktopControls,
  BirdseyeInteractionsHost,
  BirdseyeSeatGains,
  type BirdseyeSeatActions,
  type BirdseyeSeatMode,
} from './CombatSeatTurnChrome'
import CombatDeployDock, { isCombatDeployDockVisible } from './CombatDeployDock'
import './CombatSeatTurnChrome.css'

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
  showResources = true,
}: {
  player: Player
  isActive: boolean
  isFirstPlayer: boolean
  hasMentat: boolean
  riseOfIx: boolean
  onSelect: () => void
  showResources?: boolean
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
        {showResources ? <ResourceGrid player={player} riseOfIx={riseOfIx} /> : null}
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

export interface CombatSpecimenDeployProps {
  canDeploy: boolean
  deployableSpecimens: number
  deployedThisTurn: number
  specimensInTanks: number
  onDeploy: () => void
  onUndeploy: () => void
}

/** `grid` — 2×2 overlay on the board. `row` — horizontal strip (mobile). `column` — vertical stack (desktop dock). */
export type CombatAreaClusterLayout = 'grid' | 'row' | 'column'

/** Desktop birdseye: gains stack down from the portrait, or up toward it. Invented for layout compare. */
export type DesktopGainsDir = 'down' | 'up'

const DESKTOP_GAINS_DIR_KEY = 'myMentat.desktopLeaderGainsDir'

function readDesktopGainsDir(): DesktopGainsDir {
  try {
    return localStorage.getItem(DESKTOP_GAINS_DIR_KEY) === 'up' ? 'up' : 'down'
  } catch {
    return 'down'
  }
}

export interface BirdseyeSeatGainsMap {
  [playerId: number]: Gain[]
}

export interface CombatAreaClusterProps {
  players: Player[]
  activePlayerId: number
  gameState?: GameState
  modalContainerRef?: RefObject<HTMLElement | null>
  /** Inner-board % height of leader grid. Ignored for `row`. */
  gridHeightPercent?: number
  /** Overrides quadrant click (sandbox setup opens the player editor instead of the detail modal). */
  onPlayerSelect?: (player: Player) => void
  riseOfIx?: boolean
  firstPlayerMarker?: number
  mentatOwner?: number | null
  layout?: CombatAreaClusterLayout
  className?: string
  style?: React.CSSProperties
  'data-marker'?: string
  /** Birds-eye turn chrome: mobile3b (row) or desktop6 (column). */
  birdseyeMode?: BirdseyeSeatMode | null
  birdseyeActions?: BirdseyeSeatActions | null
  birdseyeGainsByPlayer?: BirdseyeSeatGainsMap
  birdseyeTroopsDeployed?: number
  birdseyeTroopsRetreated?: number
  birdseyeIsHistoryView?: boolean
  birdseyeInteractionsHostRef?: (el: HTMLDivElement | null) => void
  troopDeploy?: CombatTroopDeployProps
  dreadnoughtDeploy?: CombatDreadnoughtDeployProps
  specimenDeploy?: CombatSpecimenDeployProps
}

const CombatAreaCluster: React.FC<CombatAreaClusterProps> = ({
  players,
  activePlayerId,
  gameState,
  modalContainerRef,
  gridHeightPercent,
  onPlayerSelect,
  riseOfIx = false,
  firstPlayerMarker = 0,
  mentatOwner = null,
  layout = 'grid',
  className,
  style,
  'data-marker': dataMarker,
  birdseyeMode = null,
  birdseyeActions = null,
  birdseyeGainsByPlayer,
  birdseyeTroopsDeployed = 0,
  birdseyeTroopsRetreated = 0,
  birdseyeIsHistoryView = false,
  birdseyeInteractionsHostRef,
  troopDeploy,
  dreadnoughtDeploy,
  specimenDeploy,
}) => {
  const [detailPlayer, setDetailPlayer] = useState<Player | null>(null)
  const [desktopGainsDir, setDesktopGainsDir] = useState<DesktopGainsDir>(readDesktopGainsDir)
  const playerById = new Map(players.map(p => [p.id, p]))
  const isRow = layout === 'row'
  const isColumn = layout === 'column'
  const isLinear = isRow || isColumn
  const birdseyeEnabled =
    Boolean(birdseyeMode) && ((isRow && birdseyeMode === 'mobile3b') || (isColumn && birdseyeMode === 'desktop6'))

  useEffect(() => {
    if (!isColumn || !birdseyeEnabled) return
    try {
      localStorage.setItem(DESKTOP_GAINS_DIR_KEY, desktopGainsDir)
    } catch {
      /* ignore quota / private mode */
    }
  }, [desktopGainsDir, isColumn, birdseyeEnabled])

  const outerStyle = useMemo(() => {
    if (isLinear || gridHeightPercent == null) return style
    return {
      ...style,
      height: `${gridHeightPercent}%`,
    }
  }, [gridHeightPercent, isLinear, style])

  const renderSeat = (playerId: number) => {
    const player = playerById.get(playerId)
    if (!player) return null

    const isActive = player.id === activePlayerId
    const seatGains = birdseyeGainsByPlayer?.[player.id] ?? []
    const resolveSeatCard =
      gameState == null
        ? undefined
        : (cardId: number, name: string) =>
            resolveCardInSnapshot(gameState, player.id, cardId) ??
            (name ? resolveCardInSnapshotByName(gameState, player.id, name) : undefined)
    const showActiveActions = Boolean(
      birdseyeEnabled && isActive && birdseyeActions && !birdseyeIsHistoryView
    )
    const seatDeploy = showActiveActions
      ? { troopDeploy, dreadnoughtDeploy, specimenDeploy }
      : {}

    const quadrant = (
      <PlayerQuadrant
        player={player}
        isActive={isActive}
        isFirstPlayer={player.id === firstPlayerMarker}
        hasMentat={player.id === mentatOwner}
        riseOfIx={riseOfIx}
        onSelect={() =>
          onPlayerSelect ? onPlayerSelect(player) : setDetailPlayer(player)
        }
      />
    )

    if (!birdseyeEnabled) {
      return (
        <div
          key={playerId}
          className={[
            'combat-area-cluster__seat',
            `combat-area-cluster__seat--${player.color}`,
            isActive ? 'combat-area-cluster__seat--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {quadrant}
        </div>
      )
    }

    if (birdseyeMode === 'mobile3b') {
      return (
        <div
          key={playerId}
          className={[
            'combat-area-cluster__seat',
            'combat-area-cluster__seat--birdseye',
            `combat-area-cluster__seat--${player.color}`,
            isActive ? 'combat-area-cluster__seat--active' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <div className="combat-area-cluster__seat-main">
            <div className="combat-area-cluster__seat-chrome">
              <PlayerQuadrant
                player={player}
                isActive={isActive}
                isFirstPlayer={player.id === firstPlayerMarker}
                hasMentat={player.id === mentatOwner}
                riseOfIx={riseOfIx}
                showResources={false}
                onSelect={() =>
                  onPlayerSelect ? onPlayerSelect(player) : setDetailPlayer(player)
                }
              />
            </div>
            <div className="combat-area-cluster__seat-meta">
              <ResourceGrid player={player} riseOfIx={riseOfIx} />
              <BirdseyeSeatGains
                playerId={player.id}
                gains={seatGains}
                resolveCard={resolveSeatCard}
                troopsDeployed={isActive ? birdseyeTroopsDeployed : 0}
                troopsRetreated={isActive ? birdseyeTroopsRetreated : 0}
                /* Totals hidden for now (mobile + desktop); keep prop wiring. */
                showTotals={false}
                showSourceTitles={false}
              />
            </div>
          </div>
        </div>
      )
    }

    /* desktop6 */
    return (
      <div
        key={playerId}
        className={[
          'combat-area-cluster__seat',
          'combat-area-cluster__seat--birdseye',
          `combat-area-cluster__seat--${player.color}`,
          isActive ? 'combat-area-cluster__seat--active' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div className="combat-area-cluster__seat-main">
          <div className="combat-area-cluster__seat-leader">
            {showActiveActions && birdseyeActions ? (
              <BirdseyeDesktopControls
                player={player}
                actions={birdseyeActions}
                gameState={gameState}
                isHistoryView={birdseyeIsHistoryView}
                {...seatDeploy}
              />
            ) : null}
            <div className="combat-area-cluster__seat-chrome">
              <PlayerQuadrant
                player={player}
                isActive={isActive}
                isFirstPlayer={player.id === firstPlayerMarker}
                hasMentat={player.id === mentatOwner}
                riseOfIx={riseOfIx}
                showResources={false}
                onSelect={() =>
                  onPlayerSelect ? onPlayerSelect(player) : setDetailPlayer(player)
                }
              />
            </div>
          </div>
          <div className="combat-area-cluster__seat-meta">
            <ResourceGrid player={player} riseOfIx={riseOfIx} />
            <BirdseyeSeatGains
              playerId={player.id}
              gains={seatGains}
              resolveCard={resolveSeatCard}
              troopsDeployed={isActive ? birdseyeTroopsDeployed : 0}
              troopsRetreated={isActive ? birdseyeTroopsRetreated : 0}
              /* Totals hidden for now (mobile + desktop); keep prop wiring. */
              showTotals={false}
            />
          </div>
        </div>
        {showActiveActions ? (
          <BirdseyeInteractionsHost hostRef={birdseyeInteractionsHostRef} />
        ) : null}
      </div>
    )
  }

  /** Seat order by player id: P1 (former top-left) → P2 → P3 → P4 — turn sequence. */
  const linearPlayerIds = useMemo(
    () =>
      COMBAT_AREA_COLUMNS.flatMap(columnPlayerIds => columnPlayerIds).sort((a, b) => a - b),
    []
  )

  const activePlayer = playerById.get(activePlayerId)
  const showMobileDeploy =
    birdseyeEnabled &&
    birdseyeMode === 'mobile3b' &&
    !birdseyeIsHistoryView &&
    Boolean(activePlayer) &&
    isCombatDeployDockVisible(troopDeploy, dreadnoughtDeploy, specimenDeploy)

  return (
    <>
      <div
        className={className}
        style={outerStyle}
        data-marker={dataMarker}
      >
        <div
          className={[
            'combat-area-cluster-stack',
            isRow ? 'combat-area-cluster-stack--row' : '',
            isColumn ? 'combat-area-cluster-stack--column' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {isColumn && birdseyeEnabled ? (
            <div
              className="combat-area-cluster__gains-dir"
              role="group"
              aria-label="Leader and gains direction"
            >
              <button
                type="button"
                className="combat-area-cluster__gains-dir-btn"
                aria-pressed={desktopGainsDir === 'down'}
                onClick={() => setDesktopGainsDir('down')}
              >
                Leaders top
              </button>
              <button
                type="button"
                className="combat-area-cluster__gains-dir-btn"
                aria-pressed={desktopGainsDir === 'up'}
                onClick={() => setDesktopGainsDir('up')}
              >
                Leaders bottom
              </button>
            </div>
          ) : null}
          {showMobileDeploy && activePlayer ? (
            <div className="combat-area-cluster__mobile-deploy" onClick={e => e.stopPropagation()}>
              <CombatDeployDock
                troopDeploy={troopDeploy}
                dreadnoughtDeploy={dreadnoughtDeploy}
                specimenDeploy={specimenDeploy}
                activePlayerId={activePlayer.id}
                activePlayerColor={activePlayer.color}
              />
            </div>
          ) : null}
          <div
            className={[
              'combat-area-cluster',
              'combat-area-cluster--with-status-inline',
              isRow ? 'combat-area-cluster--row' : '',
              isColumn ? 'combat-area-cluster--column' : '',
              birdseyeEnabled ? 'combat-area-cluster--birdseye' : '',
              isColumn && birdseyeEnabled && desktopGainsDir === 'up'
                ? 'combat-area-cluster--gains-up'
                : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {isLinear
              ? linearPlayerIds.map(renderSeat)
              : COMBAT_AREA_COLUMNS.map((columnPlayerIds, columnIndex) => (
                  <div key={columnIndex} className="combat-area-cluster__column">
                    {columnPlayerIds.map(renderSeat)}
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
