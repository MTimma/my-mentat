import React, { useEffect, useState } from 'react'
import {
  SpaceProps,
  AgentIcon,
  Player,
  ConflictCard,
  MakerSpace,
  Card,
  GameState,
  FactionType,
  ControlMarkerType,
  PlayerColor,
} from '../../types/GameTypes'
import { BOARD_SPACES } from '../../data/boardSpaces'
import {
  BOARD_HOTSPOTS,
  MARKER_ANCHORS,
  BOARD_ASPECT_RATIO,
  layoutHotspotPercent,
} from '../../data/boardHotspots'
import {
  INFLUENCE_TRACKS,
  VP_LANES,
  BOARD_MARKER_VP_MAX_STEPS,
  HIGH_COUNCIL_SLOTS,
  CONFLICT_CARD_RECT,
  COMBAT_STRENGTH_ORIGIN,
  COMBAT_STRENGTH_ROW_STEP_Y,
  CONTROL_MARKER_POINTS,
  conflictCardImageSrc,
  clampInfluenceStep,
  clampVpStep,
  stagePoint,
  stageRect,
} from '../../data/boardMarkerAnchors'
import SellMelangePopup from '../SellMelangePopup/SellMelangePopup'
import BoardAgentFigure from '../AgentIcon/AgentIcon'
import { canPlaceDespiteOccupancy } from '../../data/leaderAbilities/helenaUnblockedAgents'
import { getEffectiveSolariCost } from '../../data/leaderAbilities/letoLandsraadDiscount'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import { highCouncilSlotAssignments } from '../../utils/highCouncilDisplay'
import './ImageBoard.css'

interface SellMelangeData {
  spiceCost: number
  solariReward: number
}

interface SelectiveBreedingData {
  trashedCardId: number
}

type ExtraSpaceData = SellMelangeData | SelectiveBreedingData | undefined

interface ImageBoardProps {
  currentPlayer: number
  highlightedAreas: AgentIcon[]
  infiltrate: boolean
  onSpaceClick: (spaceId: number, extraData?: ExtraSpaceData) => void
  occupiedSpaces: { [key: number]: number[] }
  canPlaceAgent: boolean
  combatTroops: Record<number, number>
  players: Player[]
  factionInfluence: { [key: string]: { [key: number]: number } }
  currentConflict?: ConflictCard
  bonusSpice: { [key: string]: number }
  onSelectiveBreedingRequested: (cards: Card[], onSelect: (card: Card) => void) => void
  recallMode?: boolean
  ignoreCosts?: boolean
  voiceSelectionActive?: boolean
  onVoiceSpaceSelect?: (spaceId: number) => void
  blockedSpaces?: Array<{ spaceId: number; playerId: number }>
  /** Full state for VP totals and High Council seat order (use display snapshot when viewing history). */
  gameStateForMarkers: GameState
  combatStrength: Record<number, number>
  controlMarkers: Record<ControlMarkerType, number | null>
}

const PLAYER_COLORS: Record<number, string> = {
  0: '#d32f2f',
  1: '#388e3c',
  2: '#fbc02d',
  3: '#1976d2',
}

const FACTIONS: FactionType[] = [
  FactionType.EMPEROR,
  FactionType.SPACING_GUILD,
  FactionType.BENE_GESSERIT,
  FactionType.FREMEN,
]

const MAKER_SPACE_IDS: Record<string, number> = {
  [MakerSpace.IMPERIAL_BASIN]: 4,
  [MakerSpace.GREAT_FLAT]: 5,
  [MakerSpace.HAGGA_BASIN]: 6,
}

function playerMarkerColor(player: Player): string {
  switch (player.color) {
    case PlayerColor.RED:
      return '#d32f2f'
    case PlayerColor.GREEN:
      return '#388e3c'
    case PlayerColor.YELLOW:
      return '#e6b800'
    case PlayerColor.BLUE:
      return '#1976d2'
    default:
      return '#888'
  }
}

const ImageBoard: React.FC<ImageBoardProps> = ({
  currentPlayer,
  highlightedAreas,
  infiltrate,
  onSpaceClick,
  occupiedSpaces,
  canPlaceAgent,
  combatTroops,
  players,
  factionInfluence,
  currentConflict,
  bonusSpice,
  onSelectiveBreedingRequested,
  recallMode = false,
  ignoreCosts = false,
  voiceSelectionActive = false,
  onVoiceSpaceSelect,
  blockedSpaces = [],
  gameStateForMarkers,
  combatStrength,
  controlMarkers,
}) => {
  const [showSellMelangePopup, setShowSellMelangePopup] = useState(false)
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [imgError, setImgError] = useState(false)
  const [conflictImgFailed, setConflictImgFailed] = useState(false)

  useEffect(() => {
    setConflictImgFailed(false)
  }, [currentConflict?.id])

  const blockedSpaceMap = new Map<number, number>()
  blockedSpaces.forEach(entry => blockedSpaceMap.set(entry.spaceId, entry.playerId))

  const canPayCosts = (space: SpaceProps): boolean => {
    if (recallMode) {
      return Boolean(occupiedSpaces[space.id]?.includes(currentPlayer))
    }
    const player = players.find(p => p.id === currentPlayer)
    if (!player) return false
    if (occupiedSpaces[space.id]?.length > 0 && !infiltrate && !canPlaceDespiteOccupancy(space, player)) return false
    if (ignoreCosts) return true
    if (space.requiresInfluence) {
      const playerInfluence = factionInfluence[space.requiresInfluence.faction]?.[currentPlayer] || 0
      if (playerInfluence < space.requiresInfluence.amount) return false
    }
    if (space.name === "High Council") {
      if (player?.hasHighCouncilSeat) return false
    }
    if (space.cost) {
      const effectiveSolari = getEffectiveSolariCost(space, player)
      if (effectiveSolari > 0 && player.solari < effectiveSolari) return false
      if (space.cost.spice && player.spice < space.cost.spice) return false
      if (space.cost.water && player.water < space.cost.water) return false
    }
    return true
  }

  const handleSpaceClick = (spaceId: number) => {
    if (voiceSelectionActive && onVoiceSpaceSelect) {
      onVoiceSpaceSelect(spaceId)
      return
    }

    const space = BOARD_SPACES.find(s => s.id === spaceId)
    if (space?.name === "Sell Melange") {
      setSelectedSpaceId(spaceId)
      setShowSellMelangePopup(true)
    } else {
      onSpaceClick(spaceId)
    }
    if (space?.name === "Selective Breeding") {
      const player = players.find(p => p.id === currentPlayer)
      if (!player) return
      onSelectiveBreedingRequested(
        [...player.deck, ...player.discardPile, ...player.playArea],
        (card) => onSpaceClick(spaceId, { trashedCardId: card.id })
      )
      return
    }
  }

  const handleSellMelangeOptionSelect = (option: { spiceCost: number; solariReward: number }) => {
    if (selectedSpaceId) {
      onSpaceClick(selectedSpaceId, option)
      setShowSellMelangePopup(false)
      setSelectedSpaceId(null)
    }
  }

  const isSpaceEnabled = (space: SpaceProps): boolean => {
    if (voiceSelectionActive) return true
    const blockedBy = blockedSpaceMap.get(space.id)
    const isBlockedForCurrent = typeof blockedBy === 'number' && blockedBy !== currentPlayer
    if (isBlockedForCurrent) return false
    if (recallMode) return Boolean(occupiedSpaces[space.id]?.includes(currentPlayer))
    return Boolean(canPayCosts(space) && canPlaceAgent && highlightedAreas?.includes(space.agentIcon))
  }

  const spaceMap = new Map<number, SpaceProps>()
  BOARD_SPACES.forEach(s => spaceMap.set(s.id, s))

  const boardImageSrc =
    (import.meta.env.VITE_BOARD_IMAGE as string | undefined)?.trim() || '/board/Board.jpg'

  const hotspotDebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('hotspotDebug')

  const markerDebug =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('markerDebug')

  const playersSorted = [...players].sort((a, b) => a.id - b.id)
  const playerById = new Map(players.map(p => [p.id, p]))

  const seatSlots = highCouncilSlotAssignments(
    players,
    gameStateForMarkers.highCouncilSeatOrder
  )

  const conflictBox = stageRect(CONFLICT_CARD_RECT)
  const conflictImgSrc =
    currentConflict && currentConflict.id > 0 ? conflictCardImageSrc(currentConflict.id) : null

  const trackerInspectMode = hotspotDebug || markerDebug

  const rootClass = [
    'image-board',
    hotspotDebug ? 'image-board--hotspot-debug' : '',
    markerDebug ? 'image-board--marker-debug' : '',
    trackerInspectMode ? 'image-board--tracker-inspect' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={rootClass}>
      <div className="image-board__stage">
        {imgError ? (
          <div
            className="image-board__fallback"
            style={{ aspectRatio: BOARD_ASPECT_RATIO }}
            role="img"
            aria-label="Game board (no image file)"
          />
        ) : (
          <img
            className="image-board__img"
            src={boardImageSrc}
            alt="Dune: Imperium game board"
            draggable={false}
            onError={() => setImgError(true)}
          />
        )}

        <div className="image-board__overlay">
          {BOARD_HOTSPOTS.map(hotspot => {
            const space = spaceMap.get(hotspot.spaceId)
            if (!space) return null

            const enabled = isSpaceEnabled(space)
            const isHighlighted = highlightedAreas?.includes(space.agentIcon) || false
            const isCombat = space.conflictMarker
            const blockedBy = blockedSpaceMap.get(space.id)
            const isVoiceBlocked = typeof blockedBy === 'number'
            const occupied = occupiedSpaces[space.id] || []

            const classes = [
              'image-board__hotspot',
              isHighlighted && enabled ? 'highlighted' : '',
              !enabled ? 'disabled' : '',
              isCombat ? 'combat-space' : '',
              voiceSelectionActive ? 'voice-selectable' : '',
              isVoiceBlocked ? 'voice-blocked' : '',
            ].filter(Boolean).join(' ')

            const occupiedBg = occupied.length > 0
              ? PLAYER_COLORS[occupied[occupied.length - 1]] || '#888'
              : undefined

            const box = layoutHotspotPercent(hotspot)

            return (
              <button
                key={hotspot.spaceId}
                className={classes}
                style={{
                  left: `${box.left}%`,
                  top: `${box.top}%`,
                  width: `${box.width}%`,
                  height: `${box.height}%`,
                  backgroundColor: occupiedBg ? `${occupiedBg}33` : undefined,
                }}
                title={space.name}
                data-space-id={hotspot.spaceId}
                data-space-name={space.name}
                onClick={() => handleSpaceClick(space.id)}
                disabled={!enabled}
              />
            )
          })}

          {MARKER_ANCHORS.map(anchor => {
            const occupied = occupiedSpaces[anchor.spaceId] || []
            if (occupied.length === 0) return null

            return occupied.map((playerId, idx) => {
              const offsetX = idx * 2.2
              return (
                <div
                  key={`${anchor.spaceId}-${playerId}-${idx}`}
                  className="image-board__marker"
                  style={{
                    left: `${anchor.x + offsetX}%`,
                    top: `${anchor.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <BoardAgentFigure playerId={playerId} className="image-board__agent-figure" />
                </div>
              )
            })
          })}

          {Object.entries(bonusSpice).map(([makerKey, count]) => {
            if (count <= 0) return null
            const spaceId = MAKER_SPACE_IDS[makerKey]
            if (spaceId === undefined) return null
            const hotspot = BOARD_HOTSPOTS.find(h => h.spaceId === spaceId)
            if (!hotspot) return null

            const b = layoutHotspotPercent(hotspot)

            return (
              <span
                key={makerKey}
                className="image-board__bonus-spice"
                style={{
                  left: `${b.left + b.width - 1}%`,
                  top: `${b.top}%`,
                }}
              >
                +{count}
              </span>
            )
          })}

          {/* Faction influence — four player columns per faction */}
          {FACTIONS.map(faction => {
            const track = INFLUENCE_TRACKS[faction]
            return playersSorted.map((player, laneIdx) => {
              const raw = factionInfluence[faction]?.[player.id] ?? 0
              const step = clampInfluenceStep(raw)
              if (step <= 0) return null
              const cx = track.laneCenterX[laneIdx]
              const cy = track.baselineY + track.stepY * step
              const st = stagePoint(cx, cy)
              return (
                <div
                  key={`inf-${faction}-${player.id}`}
                  className="image-board__tracker-circle"
                  data-marker="influence"
                  data-faction={faction}
                  data-player-id={player.id}
                  style={{
                    left: `${st.x}%`,
                    top: `${st.y}%`,
                    backgroundColor: playerMarkerColor(player),
                  }}
                  title={`${faction} influence ${step} (${player.leader.name})`}
                />
              )
            })
          })}

          {/* VP lanes */}
          {playersSorted.map((player, laneIdx) => {
            const lane = VP_LANES[laneIdx]
            if (!lane) return null
            const vp = clampVpStep(getTotalVictoryPoints(player, gameStateForMarkers))
            const innerY = lane.baselineY + lane.stepY * vp
            const st = stagePoint(lane.x, innerY)
            return (
              <div
                key={`vp-${player.id}`}
                className="image-board__tracker-circle"
                data-marker="vp"
                data-player-id={player.id}
                style={{
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                  backgroundColor: playerMarkerColor(player),
                }}
                title={`VP ${vp} (${player.leader.name})`}
              />
            )
          })}

          {/* High Council seats */}
          {seatSlots.map((pid, i) => {
            if (pid === null) return null
            const p = playerById.get(pid)
            if (!p) return null
            const slot = HIGH_COUNCIL_SLOTS[i]
            if (!slot) return null
            const st = stagePoint(slot.x, slot.y)
            return (
              <div
                key={`hc-${i}-${pid}`}
                className="image-board__tracker-circle"
                data-marker="high-council"
                data-seat-index={i}
                data-player-id={pid}
                style={{
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                  backgroundColor: playerMarkerColor(p),
                }}
                title={`High Council seat ${i + 1} (${p.leader.name})`}
              />
            )
          })}

          {/* Control markers */}
          {(Object.keys(CONTROL_MARKER_POINTS) as ControlMarkerType[]).map(key => {
            const pid = controlMarkers[key]
            if (pid === null || pid === undefined) return null
            const p = playerById.get(pid)
            if (!p) return null
            const pt = CONTROL_MARKER_POINTS[key]
            const st = stagePoint(pt.x, pt.y)
            return (
              <div
                key={`ctl-${key}`}
                className="image-board__tracker-circle image-board__tracker-circle--control"
                data-marker="control"
                data-control={key}
                data-player-id={pid}
                style={{
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                  backgroundColor: playerMarkerColor(p),
                }}
                title={`Control ${key} (${p.leader.name})`}
              />
            )
          })}

          {/* Conflict card + combat numbers (hidden until a real conflict is selected) */}
          {currentConflict && currentConflict.id > 0 && (
            <>
              <div
                className="image-board__conflict-panel"
                data-marker="conflict-card"
                style={{
                  left: `${conflictBox.left}%`,
                  top: `${conflictBox.top}%`,
                  width: `${conflictBox.width}%`,
                  height: `${conflictBox.height}%`,
                }}
              >
                {conflictImgSrc && !conflictImgFailed ? (
                  <img
                    className="image-board__conflict-card-img"
                    src={conflictImgSrc}
                    alt={currentConflict.name}
                    draggable={false}
                    onError={() => setConflictImgFailed(true)}
                  />
                ) : (
                  <div className="image-board__conflict-fallback">
                    <span className="image-board__conflict-tier">T{currentConflict.tier}</span>
                    <span className="image-board__conflict-name">{currentConflict.name}</span>
                  </div>
                )}
              </div>

              {playersSorted.map((p, row) => {
                const str = combatStrength[p.id] ?? 0
                const troops = combatTroops[p.id] ?? 0
                const o = COMBAT_STRENGTH_ORIGIN
                const st = stagePoint(o.x, o.y + row * COMBAT_STRENGTH_ROW_STEP_Y)
                return (
                  <div
                    key={`cmb-${p.id}`}
                    className="image-board__combat-stat"
                    data-marker="combat-strength"
                    data-player-id={p.id}
                    style={{ left: `${st.x}%`, top: `${st.y}%` }}
                    title={`${p.leader.name}: strength ${str}, troops in conflict ${troops}`}
                  >
                    <span className="image-board__combat-stat-p">{p.leader.name}</span>
                    <span className="image-board__combat-stat-n">
                      str&nbsp;{str}
                      {troops > 0 ? (
                        <>
                          {' '}
                          <span className="image-board__combat-stat-sep">·</span> trp&nbsp;{troops}
                        </>
                      ) : null}
                    </span>
                  </div>
                )
              })}
            </>
          )}

          {markerDebug && (
            <div className="image-board__marker-debug-layer" aria-hidden>
              <div
                className="image-board__marker-debug-rect"
                style={{
                  left: `${conflictBox.left}%`,
                  top: `${conflictBox.top}%`,
                  width: `${conflictBox.width}%`,
                  height: `${conflictBox.height}%`,
                }}
              />
              {HIGH_COUNCIL_SLOTS.map((s, i) => {
                const st = stagePoint(s.x, s.y)
                return (
                  <div
                    key={`db-hc-${i}`}
                    className="image-board__marker-debug-dot"
                    style={{ left: `${st.x}%`, top: `${st.y}%` }}
                  />
                )
              })}
              {FACTIONS.flatMap(faction =>
                INFLUENCE_TRACKS[faction].laneCenterX.map((cx, li) => {
                  const tr = INFLUENCE_TRACKS[faction]
                  const y0 = tr.baselineY + tr.stepY * 6
                  const y1 = tr.baselineY
                  const st0 = stagePoint(cx, y0)
                  const st1 = stagePoint(cx, y1)
                  const top = Math.min(st0.y, st1.y)
                  const h = Math.abs(st1.y - st0.y)
                  return (
                    <div
                      key={`db-inf-${faction}-${li}`}
                      className="image-board__marker-debug-line"
                      style={{
                        left: `${st0.x}%`,
                        top: `${top}%`,
                        width: '0.5%',
                        height: `${h}%`,
                      }}
                    />
                  )
                })
              )}
              {VP_LANES.map((lane, li) => {
                const yMaxVp = lane.baselineY + lane.stepY * BOARD_MARKER_VP_MAX_STEPS
                const yBase = lane.baselineY
                const stMax = stagePoint(lane.x, yMaxVp)
                const stBase = stagePoint(lane.x, yBase)
                const topPct = Math.min(stMax.y, stBase.y)
                const heightPct = Math.abs(stBase.y - stMax.y)
                return (
                  <div
                    key={`db-vp-${li}`}
                    className="image-board__marker-debug-line"
                    style={{
                      left: `${stBase.x}%`,
                      top: `${topPct}%`,
                      width: '0.45%',
                      height: `${heightPct}%`,
                    }}
                  />
                )
              })}
              {(Object.keys(CONTROL_MARKER_POINTS) as ControlMarkerType[]).map(key => {
                const pt = CONTROL_MARKER_POINTS[key]
                const st = stagePoint(pt.x, pt.y)
                return (
                  <div
                    key={`db-ctl-${key}`}
                    className="image-board__marker-debug-dot image-board__marker-debug-dot--lg"
                    style={{ left: `${st.x}%`, top: `${st.y}%` }}
                  />
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showSellMelangePopup && (
        <SellMelangePopup
          playerSpice={players.find(p => p.id === currentPlayer)?.spice || 0}
          onOptionSelect={handleSellMelangeOptionSelect}
          onClose={() => {
            setShowSellMelangePopup(false)
            setSelectedSpaceId(null)
          }}
        />
      )}
    </div>
  )
}

export default ImageBoard
