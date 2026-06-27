import React, { useEffect, useRef, useState } from 'react'
import {
  SpaceProps,
  AgentIcon,
  Player,
  ConflictCard,
  MakerSpace,
  Card,
  GameState,
  GamePhase,
  FactionType,
  ControlMarkerType,
  PlayerColor,
} from '../../types/GameTypes'
import { BOARD_SPACES } from '../../data/boardSpaces'
import {
  BOARD_HOTSPOTS_FOR_EXPANSIONS,
  layoutAgentAnchorPercent,
  layoutHotspotPercent,
  layoutInnerRectPercent,
  markerAnchorsForExpansions,
} from '../../data/boardHotspots'
import {
  choamOverlayRectFor,
  dreadnoughtControlPointsFor,
  shippingTrackAnchorsFor,
} from '../../data/expansionBoardMarkers'
import { IX_BOARD_HOTSPOTS, layoutIxLocalRectPercent } from '../../data/ixBoardAnchors'
import { SpiceAmountBadge } from '../SpiceAmountBadge/SpiceAmountBadge'
import {
  INFLUENCE_TRACKS,
  VP_LANES,
  BOARD_MARKER_VP_MAX_STEPS,
  HIGH_COUNCIL_SLOTS,
  CONFLICT_CARD_RECT,
  COMBAT_RING_ANCHORS,
  COMBAT_AREA_BOUNDS,
  CONTROL_MARKER_POINTS,
  BONUS_SPICE_ANCHORS,
  conflictCardImageSrc,
  clampInfluenceStep,
  clampVpStep,
  INFLUENCE_TRACK_AREAS,
  influenceTrackAreaRect,
  SNOOPER_TOKEN_ANCHORS,
  snooperTokenPoint,
  snooperTokenHeightPercent,
  mentatAvailabilityPoint,
  swordmasterEligibilityPoint,
  stagePoint,
  stageRect,
} from '../../data/boardMarkerAnchors'
import { isTessiaLeader, hasOnTrackSnooper } from '../../data/leaderAbilities/tessiaSnoopers'
import type { InfluenceBoardMode } from '../../utils/influenceBoardChoice'
import SellMelangePopup from '../SellMelangePopup/SellMelangePopup'
import BoardAgentFigure from '../AgentIcon/AgentIcon'
import ControlMarkerIcon from '../ControlMarkerIcon/ControlMarkerIcon'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import { canPlaceDespiteOccupancy } from '../../data/leaderAbilities/helenaUnblockedAgents'
import { getEffectiveSolariCost } from '../../data/leaderAbilities/letoLandsraadDiscount'
import {
  canPlayerVisitBoardSpaceOnce,
  isBoardSpaceAvailableForExpansions,
  isMentatAvailableOnBoard,
  playersEligibleForSwordmaster,
} from '../../data/boardSpaceAvailability'
import { getTotalVictoryPoints } from '../../utils/influenceVictoryPoints'
import { highCouncilSlotAssignments } from '../../utils/highCouncilDisplay'
import CombatAreaCluster, {
  type CombatDreadnoughtDeployProps,
  type CombatNegotiatorDeployProps,
  type CombatTroopDeployProps,
} from './CombatAreaCluster'
import IxBoardOverlay, { type IxBoardPlacement } from './IxBoardOverlay'
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
  /** Shown above the board during Kwisatz recall / agent-source steps. */
  placementPrompt?: string | null
  /** Kwisatz Haderach: ignore influence requirements (not spice/solari/water costs). */
  ignoreSpaceRequirements?: boolean
  voiceSelectionActive?: boolean
  onVoiceSpaceSelect?: (spaceId: number) => void
  blockedSpaces?: Array<{ spaceId: number; playerId: number }>
  /** Full state for VP totals and High Council seat order (use display snapshot when viewing history). */
  gameStateForMarkers: GameState
  combatStrength: Record<number, number>
  controlMarkers: Record<ControlMarkerType, number | null>
  /** When viewing turn history, outline the board space where this turn's agent was placed. */
  historyHighlightSpaceId?: number | null
  /** Active-player troop deploy controls; rendered below the combat area cluster. */
  troopDeploy?: CombatTroopDeployProps
  dreadnoughtDeploy?: CombatDreadnoughtDeployProps
  negotiatorDeploy?: CombatNegotiatorDeployProps
  /** Sandbox setup turn: conflict slot and player quadrants become configuration targets. */
  sandboxSetup?: {
    onConflictClick: () => void
    onPlayerClick: (playerId: number) => void
    onTechTilesClick?: () => void
    sandboxTechRequiredFilledStacks?: number
  }
  /** Tap faction influence tracks (e.g. Shifting Allegiances). */
  influenceSelection?: {
    mode: InfluenceBoardMode
    amount: number
    selectableFactions: FactionType[]
    disabledFactions: FactionType[]
    onFactionSelect: (faction: FactionType) => void
  }
  /** Desktop: Ix panel docked beside board; mobile: embedded on board art. */
  ixBoardPlacement?: IxBoardPlacement
  /** Rise of Ix — player may click a face-up tech tile on the Ix board to acquire. */
  pendingAcquireTech?: GameState['pendingAcquireTech']
  onTechTileAcquire?: (stackIndex: number) => void
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

/** Same path as The Voice cards in `cards.ts` — small board marker for blocked spaces */
const VOICE_CARD_IMAGE_SRC = 'imperium_row/the_voice.avif'

/** Map inner-board percent rect to CSS % on the full stage. */
function percentToStyle(rect: { left: number; top: number; width: number; height: number }) {
  return {
    left: `${rect.left}%`,
    top: `${rect.top}%`,
    width: `${rect.width}%`,
    height: `${rect.height}%`,
  }
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
  placementPrompt = null,
  ignoreSpaceRequirements = false,
  voiceSelectionActive = false,
  onVoiceSpaceSelect,
  blockedSpaces = [],
  gameStateForMarkers,
  combatStrength,
  controlMarkers,
  historyHighlightSpaceId = null,
  troopDeploy,
  dreadnoughtDeploy,
  negotiatorDeploy,
  sandboxSetup,
  influenceSelection,
  ixBoardPlacement = 'embedded',
  pendingAcquireTech,
  onTechTileAcquire,
}) => {
  const boardMediaRef = useRef<HTMLDivElement>(null)
  const [showSellMelangePopup, setShowSellMelangePopup] = useState(false)
  const [selectedSpaceId, setSelectedSpaceId] = useState<number | null>(null)
  const [imgError, setImgError] = useState(false)
  const [conflictImgFailed, setConflictImgFailed] = useState(false)

  useEffect(() => {
    setConflictImgFailed(false)
  }, [currentConflict?.id])

  const blockedSpaceMap = new Map<number, number>()
  blockedSpaces.forEach(entry => blockedSpaceMap.set(entry.spaceId, entry.playerId))

  const riseOfIx = Boolean(gameStateForMarkers.expansions?.riseOfIx)
  const expansions = gameStateForMarkers.expansions
  const choamOverlayRect = choamOverlayRectFor(expansions)
  const shippingTrackAnchors = shippingTrackAnchorsFor(expansions)
  const dreadnoughtControlPoints = dreadnoughtControlPointsFor(expansions)
  const ixBoardDocked = riseOfIx && ixBoardPlacement === 'docked'
  const boardHotspots = BOARD_HOTSPOTS_FOR_EXPANSIONS(gameStateForMarkers.expansions)
  const markerAnchors = markerAnchorsForExpansions(gameStateForMarkers.expansions).filter(
    anchor => !ixBoardDocked || (anchor.spaceId !== 23 && anchor.spaceId !== 24)
  )

  const canPayCosts = (space: SpaceProps): boolean => {
    if (recallMode) {
      return Boolean(occupiedSpaces[space.id]?.includes(currentPlayer))
    }
    const player = players.find(p => p.id === currentPlayer)
    if (!player) return false
    if (!isBoardSpaceAvailableForExpansions(space, gameStateForMarkers.expansions)) {
      return false
    }
    if (!canPlayerVisitBoardSpaceOnce(space, player)) return false
    if (occupiedSpaces[space.id]?.length > 0 && !infiltrate && !canPlaceDespiteOccupancy(space, player)) return false
    if (space.requiresInfluence && !ignoreSpaceRequirements) {
      const playerInfluence = factionInfluence[space.requiresInfluence.faction]?.[currentPlayer] || 0
      if (playerInfluence < space.requiresInfluence.amount) return false
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
    if (influenceSelection) return
    if (voiceSelectionActive && onVoiceSpaceSelect) {
      onVoiceSpaceSelect(spaceId)
      return
    }

    const space = BOARD_SPACES.find(s => s.id === spaceId)
    if (space?.specialEffect === 'sellMelange') {
      if (riseOfIx) return
      setSelectedSpaceId(spaceId)
      setShowSellMelangePopup(true)
      return
    }
    if (space?.name === 'Selective Breeding') {
      const player = players.find(p => p.id === currentPlayer)
      if (!player) return
      onSelectiveBreedingRequested(
        [...player.deck, ...player.discardPile, ...player.playArea],
        card => onSpaceClick(spaceId, { trashedCardId: card.id })
      )
      return
    }
    onSpaceClick(spaceId)
  }

  const handleSellMelangeOptionSelect = (option: { spiceCost: number; solariReward: number }) => {
    if (selectedSpaceId) {
      onSpaceClick(selectedSpaceId, option)
      setShowSellMelangePopup(false)
      setSelectedSpaceId(null)
    }
  }

  const isSpaceEnabled = (space: SpaceProps): boolean => {
    if (influenceSelection) return false
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
  const handleInfluenceFactionPick = (faction: FactionType) => {
    if (!influenceSelection) return
    influenceSelection.onFactionSelect(faction)
  }

  const seatSlots = highCouncilSlotAssignments(
    players,
    gameStateForMarkers.highCouncilSeatOrder
  )

  const conflictBox = stageRect(CONFLICT_CARD_RECT)
  const conflictImgSrc =
    currentConflict && currentConflict.id > 0 ? conflictCardImageSrc(currentConflict.id) : null
  const hasConflict = Boolean(currentConflict && currentConflict.id > 0)
  const inActivePlay =
    players.length > 0 &&
    !gameStateForMarkers.sandboxSetup &&
    gameStateForMarkers.phase !== GamePhase.ROUND_START
  const showConflictPanel = hasConflict || Boolean(sandboxSetup)
  const showCombatArea = showConflictPanel || inActivePlay

  const historyHighlightHotspot =
    historyHighlightSpaceId != null
      ? boardHotspots.find(h => h.spaceId === historyHighlightSpaceId) ??
        (!ixBoardDocked
          ? IX_BOARD_HOTSPOTS.find(h => h.spaceId === historyHighlightSpaceId)
          : undefined)
      : undefined
  const historyHighlightBox = historyHighlightHotspot
    ? boardHotspots.some(h => h.spaceId === historyHighlightHotspot.spaceId)
      ? layoutHotspotPercent(historyHighlightHotspot)
      : layoutIxLocalRectPercent({
          left: historyHighlightHotspot.left,
          top: historyHighlightHotspot.top,
          width: historyHighlightHotspot.width,
          height: historyHighlightHotspot.height,
        })
    : null

  const trackerInspectMode = hotspotDebug || markerDebug

  const rootClass = [
    'image-board',
    ixBoardDocked ? 'image-board--with-ix-dock' : '',
    hotspotDebug ? 'image-board--hotspot-debug' : '',
    markerDebug ? 'image-board--marker-debug' : '',
    trackerInspectMode ? 'image-board--tracker-inspect' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const ixBoardOverlay =
    riseOfIx ? (
      <IxBoardOverlay
        players={players}
        occupiedSpaces={occupiedSpaces}
        stacks={gameStateForMarkers.ixBoard?.stacks ?? [[], [], []]}
        onSpaceClick={handleSpaceClick}
        isSpaceEnabled={space => isSpaceEnabled(space)}
        highlightedAreas={highlightedAreas}
        hotspotDebug={hotspotDebug}
        blockedSpaceMap={blockedSpaceMap}
        placement={ixBoardPlacement}
        historyHighlightSpaceId={
          ixBoardDocked &&
          (historyHighlightSpaceId === 23 || historyHighlightSpaceId === 24)
            ? historyHighlightSpaceId
            : null
        }
        sandboxTechSetup={
          sandboxSetup?.onTechTilesClick
            ? {
                onConfigure: sandboxSetup.onTechTilesClick,
                requiredFilledStacks: sandboxSetup.sandboxTechRequiredFilledStacks ?? 3,
              }
            : undefined
        }
        currentPlayerId={currentPlayer}
        techAcquire={
          pendingAcquireTech
            ? {
                playerId: pendingAcquireTech.playerId,
                discount: pendingAcquireTech.discount,
                paySolariInsteadOfSpice: pendingAcquireTech.paySolariInsteadOfSpice,
              }
            : undefined
        }
        onTechTileAcquire={onTechTileAcquire}
      />
    ) : null

  const boardStage = (
    <div className="image-board__stage">
      <div className="image-board__media" ref={boardMediaRef}>
          {imgError ? (
            <div
              className="image-board__fallback"
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

          {choamOverlayRect && (
            <img
              className="image-board__choam-overlay"
              src="/board/riseofix/riseofix1.png"
              alt="CHOAM overlay"
              draggable={false}
              style={percentToStyle(layoutInnerRectPercent(choamOverlayRect))}
            />
          )}

          {riseOfIx && !ixBoardDocked && ixBoardOverlay}

          <div className="image-board__overlay">
          {boardHotspots.map(hotspot => {
            const space = spaceMap.get(hotspot.spaceId)
            if (!space) return null

            const enabled = isSpaceEnabled(space)
            const isHighlighted = highlightedAreas?.includes(space.agentIcon) || false
            const isRecallTarget =
              recallMode && Boolean(occupiedSpaces[space.id]?.includes(currentPlayer))
            const isCombat = space.conflictMarker
            const blockedBy = blockedSpaceMap.get(space.id)
            const isVoiceBlocked = typeof blockedBy === 'number'
            const occupied = occupiedSpaces[space.id] || []

            const classes = [
              'image-board__hotspot',
              isRecallTarget ? 'recall-selectable' : '',
              isHighlighted && enabled ? 'highlighted' : '',
              recallMode && !isRecallTarget ? 'recall-dimmed' : '',
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

          {historyHighlightBox && (
            <div
              className="image-board__history-space-highlight"
              style={{
                left: `${historyHighlightBox.left}%`,
                top: `${historyHighlightBox.top}%`,
                width: `${historyHighlightBox.width}%`,
                height: `${historyHighlightBox.height}%`,
              }}
              aria-hidden
            />
          )}

          {hotspotDebug &&
            boardHotspots.map(h => {
              const anchor = layoutAgentAnchorPercent(h)
              return (
                <div
                  key={`agent-anchor-${h.spaceId}`}
                  className="image-board__agent-anchor-debug"
                  data-space-id={h.spaceId}
                  style={{
                    left: `${anchor.x}%`,
                    top: `${anchor.y}%`,
                  }}
                  title={`Agent anchor ${h.spaceId}: ${h.agentX}%, ${h.agentY}%`}
                />
              )
            })}

          {/* The Voice — same anchor as agent figures; drawn under agents so figures stay visible when occupied */}
          {[...blockedSpaceMap.entries()].map(([spaceId, blockerPlayerId]) => {
            const anchor = markerAnchors.find(a => a.spaceId === spaceId)
            if (!anchor) return null
            const ring = PLAYER_COLORS[blockerPlayerId] || '#ffa726'
            return (
              <div
                key={`voice-thumb-${spaceId}`}
                className="image-board__voice-block-thumb"
                style={{
                  left: `${anchor.x}%`,
                  top: `${anchor.y}%`,
                  transform: 'translate(-50%, -50%)',
                  boxShadow: `0 0 0 2px ${ring}, 0 2px 8px rgba(0,0,0,0.5)`,
                }}
                title="Blocked by The Voice this round"
              >
                <img src={VOICE_CARD_IMAGE_SRC} alt="" draggable={false} />
              </div>
            )
          })}

          {markerAnchors.map(anchor => {
            if (riseOfIx && (anchor.spaceId === 23 || anchor.spaceId === 24)) return null
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
                  }}
                >
                  <BoardAgentFigure
                    playerId={playerId}
                    variant={anchor.spaceId === 23 ? 'dreadnought' : 'troop'}
                    className="image-board__agent-figure"
                  />
                </div>
              )
            })
          })}

          {(Object.keys(BONUS_SPICE_ANCHORS) as MakerSpace[]).map(makerKey => {
            const count = bonusSpice[makerKey] ?? 0
            if (count <= 0) return null
            const anchor = BONUS_SPICE_ANCHORS[makerKey]
            const st = stagePoint(anchor.x, anchor.y)

            return (
              <div
                key={makerKey}
                className="image-board__bonus-spice-anchor"
                data-marker="bonus-spice"
                data-maker={makerKey}
                style={{
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                }}
              >
                <SpiceAmountBadge
                  amount={count}
                  className="image-board__bonus-spice"
                  title={`Bonus spice: ${count}`}
                />
              </div>
            )
          })}

          {/* Faction influence — four player columns per faction */}
          {FACTIONS.map(faction => {
            const track = INFLUENCE_TRACKS[faction]
            return playersSorted.map((player, laneIdx) => {
              const raw = factionInfluence[faction]?.[player.id] ?? 0
              const step = clampInfluenceStep(raw)
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

          {/* Tessia Vernius — snooper tokens on influence tracks (RoI only) */}
          {riseOfIx &&
            playersSorted.flatMap(player => {
              if (!isTessiaLeader(player.leader)) return []
              return FACTIONS.flatMap(faction => {
                if (!hasOnTrackSnooper(player, faction)) return []
                const inner = snooperTokenPoint(faction, INFLUENCE_TRACKS)
                const st = stagePoint(inner.x, inner.y)
                const tokenHeight = snooperTokenHeightPercent(faction, INFLUENCE_TRACKS)
                return (
                  <div
                    key={`snooper-${player.id}-${faction}`}
                    className="image-board__snooper-token"
                    data-marker="snooper"
                    data-faction={faction}
                    data-player-id={player.id}
                    style={{
                      left: `${st.x}%`,
                      top: `${st.y}%`,
                      ['--snooper-token-height' as string]: `${tokenHeight}%`,
                    }}
                    title={`Snooper on ${faction} (${player.leader.name})`}
                  >
                    <img src="/icon/snooper.png" alt="" aria-hidden="true" />
                  </div>
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

          {/* Mentat — on board when not held by a player */}
          {(() => {
            const mentatHotspot = boardHotspots.find(h => h.spaceId === 10)
            if (!mentatHotspot || !isMentatAvailableOnBoard(gameStateForMarkers.mentatOwner)) {
              return null
            }
            const pt = mentatAvailabilityPoint(mentatHotspot)
            return (
              <div
                className="image-board__mentat-marker"
                data-marker="mentat-available"
                style={{
                  left: `${pt.x}%`,
                  top: `${pt.y}%`,
                }}
                title="Mentat available on board"
              >
                <img src="/icon/mentat.png" alt="" className="image-board__mentat-marker-img" draggable={false} />
              </div>
            )
          })()}

          {/* Swordmaster — player colors for those who can still visit once */}
          {(() => {
            const swordHotspot = boardHotspots.find(h => h.spaceId === 13)
            if (!swordHotspot) return null
            const eligible = playersEligibleForSwordmaster(players)
            return eligible.map((player, idx) => {
              const pt = swordmasterEligibilityPoint(swordHotspot, idx, eligible.length)
              return (
                <div
                  key={`sm-eligible-${player.id}`}
                  className="image-board__tracker-circle"
                  data-marker="swordmaster-eligibility"
                  data-player-id={player.id}
                  style={{
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    backgroundColor: playerMarkerColor(player),
                  }}
                  title={`${player.leader.name} can still take Swordmaster`}
                />
              )
            })
          })()}

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
                className="image-board__control-marker"
                data-marker="control"
                data-control={key}
                data-player-id={pid}
                style={{
                  left: `${st.x}%`,
                  top: `${st.y}%`,
                }}
                title={`Control ${key} (${p.leader.name})`}
              >
                <ControlMarkerIcon playerId={pid} className="image-board__control-marker-icon" />
              </div>
            )
          })}

          {/* Dreadnought control — overlays control bonus; may exist without a control marker */}
          {riseOfIx &&
            dreadnoughtControlPoints &&
            (Object.keys(CONTROL_MARKER_POINTS) as ControlMarkerType[]).map(key => {
              const dreadOwnerId = gameStateForMarkers.dreadnoughtCover?.[key]
              const dreadOwner =
                dreadOwnerId != null ? playerById.get(dreadOwnerId) : undefined
              const dreadnoughtOnControl =
                dreadOwner?.dreadnoughts?.control?.some(entry => entry.space === key) ??
                players.some(pl => pl.dreadnoughts?.control?.some(entry => entry.space === key))
              if (!dreadnoughtOnControl) return null
              const dreadPlayer =
                dreadOwner ??
                players.find(pl => pl.dreadnoughts?.control?.some(entry => entry.space === key))
              const dreadPt = dreadnoughtControlPoints[key]
              if (!dreadPlayer || !dreadPt) return null
              const dreadSt = stagePoint(dreadPt.x, dreadPt.y)
              return (
                <div
                  key={`dread-ctl-${key}`}
                  className="image-board__dreadnought-control-marker"
                  data-marker="dreadnought-control"
                  data-control={key}
                  data-player-id={dreadPlayer.id}
                  style={{
                    left: `${dreadSt.x}%`,
                    top: `${dreadSt.y}%`,
                  }}
                  title={`Dreadnought on ${key} (${dreadPlayer.leader.name})`}
                >
                  <DreadnoughtIcon
                    playerId={dreadPlayer.id}
                    appearance="control"
                    className="image-board__dreadnought-control-icon"
                  />
                </div>
              )
            })}

          {riseOfIx && shippingTrackAnchors && (
            <>
              {playersSorted.map((player, laneIdx) => {
                const step = player.freighterStep ?? 0
                const laneAnchor = shippingTrackAnchors.find(a => a.player === laneIdx)
                if (!laneAnchor) return null
                const cy = laneAnchor.laneCenterY[step]
                if (cy === undefined) return null
                const st = stagePoint(laneAnchor.x, cy)
                return (
                  <div
                    key={`freighter-${player.id}`}
                    className="image-board__freighter-disc"
                    data-marker="freighter"
                    data-player-id={player.id}
                    style={{
                      left: `${st.x}%`,
                      top: `${st.y}%`,
                      backgroundColor: playerMarkerColor(player),
                    }}
                    title={`Freighter step ${step} (${player.leader.name})`}
                  />
                )
              })}
            </>
          )}

          {/* Conflict card: hidden until selected (sandbox shows a picker target).
              Combat area: also shown during active play after sandbox commit. */}
          {showConflictPanel && (
            <>
              {(() => {
                const conflictContent =
                  hasConflict && conflictImgSrc && !conflictImgFailed ? (
                    <img
                      className="image-board__conflict-card-img"
                      src={conflictImgSrc}
                      alt={currentConflict?.name}
                      draggable={false}
                      onError={() => setConflictImgFailed(true)}
                    />
                  ) : hasConflict && currentConflict ? (
                    <div className="image-board__conflict-fallback">
                      <span className="image-board__conflict-tier">T{currentConflict.tier}</span>
                      <span className="image-board__conflict-name">{currentConflict.name}</span>
                    </div>
                  ) : (
                    <div className="image-board__conflict-placeholder">
                      <span>Select Conflict</span>
                    </div>
                  )

                const panelStyle = {
                  left: `${conflictBox.left}%`,
                  top: `${conflictBox.top}%`,
                  width: `${conflictBox.width}%`,
                  height: `${conflictBox.height}%`,
                }

                return sandboxSetup ? (
                  <>
                    <button
                      type="button"
                      className="image-board__conflict-panel image-board__conflict-panel--sandbox"
                      data-marker="conflict-card"
                      style={panelStyle}
                      title={hasConflict ? 'Change conflict card' : 'Select conflict card'}
                      onClick={sandboxSetup.onConflictClick}
                    >
                      {conflictContent}
                    </button>
                    {/* <SandboxSetupHint
                      anchor="center"
                      placement="above"
                      label="Pick this round's conflict card"
                      style={{
                        left: `${conflictBox.left + conflictBox.width / 2}%`,
                        top: `${conflictBox.top}%`,
                      }}
                    /> */}
                  </>
                ) : (
                  <div
                    className="image-board__conflict-panel"
                    data-marker="conflict-card"
                    style={panelStyle}
                  >
                    {conflictContent}
                  </div>
                )
              })()}
            </>
          )}

          {showCombatArea && (
            (() => {
              const area = stageRect(COMBAT_AREA_BOUNDS)
              return (
                <CombatAreaCluster
                  players={players}
                  troops={combatTroops}
                  strength={combatStrength}
                  activePlayerId={currentPlayer}
                  gameState={gameStateForMarkers}
                  modalContainerRef={boardMediaRef}
                  troopDeploy={troopDeploy}
                  dreadnoughtDeploy={dreadnoughtDeploy}
                  negotiatorDeploy={negotiatorDeploy}
                  riseOfIx={riseOfIx}
                  firstPlayerMarker={gameStateForMarkers.firstPlayerMarker}
                  mentatOwner={gameStateForMarkers.mentatOwner}
                  gridHeightPercent={COMBAT_AREA_BOUNDS.height}
                  onPlayerSelect={
                    sandboxSetup ? player => sandboxSetup.onPlayerClick(player.id) : undefined
                  }
                  className="image-board__combat-area-cluster"
                  data-marker="combat-area"
                  style={{
                    left: `${area.left}%`,
                    top: `${area.top}%`,
                    width: `${area.width}%`,
                    height: `${area.height}%`,
                  }}
                />
              )
            })()
          )}

          {influenceSelection ? (
            <div className="image-board__influence-selection-layer" aria-hidden={false}>
              {FACTIONS.map(faction => {
                const isSelectable = influenceSelection.selectableFactions.includes(faction)
                const isDisabled = influenceSelection.disabledFactions.includes(faction)
                if (!isSelectable && !isDisabled) return null

                const box = stageRect(influenceTrackAreaRect(faction))
                const factionLabel = faction
                  .split('-')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ')

                return (
                  <React.Fragment key={`inf-select-${faction}`}>
                    <div
                      className={[
                        'image-board__influence-track-highlight',
                        isSelectable ? 'image-board__influence-track-highlight--active' : '',
                        isDisabled ? 'image-board__influence-track-highlight--disabled' : '',
                        `image-board__influence-track-highlight--${influenceSelection.mode}`,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      style={{
                        left: `${box.left}%`,
                        top: `${box.top}%`,
                        width: `${box.width}%`,
                        height: `${box.height}%`,
                      }}
                      aria-hidden="true"
                    />
                    {isSelectable ? (
                      <button
                        type="button"
                        className={[
                          'image-board__influence-track-target',
                          `image-board__influence-track-target--${influenceSelection.mode}`,
                        ].join(' ')}
                        style={{
                          left: `${box.left}%`,
                          top: `${box.top}%`,
                          width: `${box.width}%`,
                          height: `${box.height}%`,
                        }}
                        title={
                          influenceSelection.mode === 'lose'
                            ? `Lose ${influenceSelection.amount} ${factionLabel} influence`
                            : `Gain ${influenceSelection.amount} ${factionLabel} influence`
                        }
                        aria-label={
                          influenceSelection.mode === 'lose'
                            ? `Lose ${influenceSelection.amount} influence with ${factionLabel}`
                            : `Gain ${influenceSelection.amount} influence with ${factionLabel}`
                        }
                        onPointerDown={event => event.stopPropagation()}
                        onClick={() => handleInfluenceFactionPick(faction)}
                      />
                    ) : null}
                  </React.Fragment>
                )
              })}
            </div>
          ) : null}

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
              {(() => {
                const mentatHotspot = boardHotspots.find(h => h.spaceId === 10)
                if (!mentatHotspot) return null
                const pt = mentatAvailabilityPoint(mentatHotspot)
                return (
                  <div
                    key="db-mentat"
                    className="image-board__marker-debug-dot image-board__marker-debug-dot--mentat"
                    style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  />
                )
              })()}
              {(() => {
                const swordHotspot = boardHotspots.find(h => h.spaceId === 13)
                if (!swordHotspot) return null
                return playersSorted.map((player, idx) => {
                  const pt = swordmasterEligibilityPoint(swordHotspot, idx, playersSorted.length)
                  return (
                    <div
                      key={`db-sm-${player.id}`}
                      className="image-board__marker-debug-dot image-board__marker-debug-dot--swordmaster"
                      data-player-id={player.id}
                      style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                    />
                  )
                })
              })()}
              {(Object.keys(INFLUENCE_TRACK_AREAS) as FactionType[]).map(faction => {
                const areaBox = stageRect(INFLUENCE_TRACK_AREAS[faction])
                return (
                  <div
                    key={`db-inf-area-${faction}`}
                    className="image-board__marker-debug-rect image-board__marker-debug-rect--influence-area"
                    data-faction={faction}
                    style={{
                      left: `${areaBox.left}%`,
                      top: `${areaBox.top}%`,
                      width: `${areaBox.width}%`,
                      height: `${areaBox.height}%`,
                    }}
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
              {SNOOPER_TOKEN_ANCHORS.map(anchor => {
                const inner = snooperTokenPoint(anchor.faction, INFLUENCE_TRACKS)
                const st = stagePoint(inner.x, inner.y)
                return (
                  <div
                    key={`db-snooper-${anchor.faction}`}
                    className="image-board__marker-debug-dot image-board__marker-debug-dot--snooper"
                    data-faction={anchor.faction}
                    style={{ left: `${st.x}%`, top: `${st.y}%` }}
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
              {(() => {
                const area = stageRect(COMBAT_AREA_BOUNDS)
                return (
                  <div
                    key="db-cmb-area"
                    className="image-board__marker-debug-rect image-board__marker-debug-rect--combat-area"
                    data-combat-area
                    style={{
                      left: `${area.left}%`,
                      top: `${area.top}%`,
                      width: `${area.width}%`,
                      height: `${area.height}%`,
                    }}
                  />
                )
              })()}
              {(Object.values(PlayerColor) as PlayerColor[]).map(color => {
                const pt = COMBAT_RING_ANCHORS[color]
                const st = stagePoint(pt.x, pt.y)
                return (
                  <div
                    key={`db-cmb-ring-${color}`}
                    className="image-board__marker-debug-dot image-board__marker-debug-dot--ring"
                    data-combat-ring={color}
                    style={{ left: `${st.x}%`, top: `${st.y}%` }}
                  />
                )
              })}
              {(Object.keys(BONUS_SPICE_ANCHORS) as MakerSpace[]).map(key => {
                const pt = BONUS_SPICE_ANCHORS[key]
                const st = stagePoint(pt.x, pt.y)
                return (
                  <div
                    key={`db-spice-${key}`}
                    className="image-board__marker-debug-dot"
                    data-marker="bonus-spice"
                    data-maker={key}
                    style={{ left: `${st.x}%`, top: `${st.y}%` }}
                  />
                )
              })}
            </div>
          )}
          </div>
        </div>
    </div>
  )

  return (
    <div className={rootClass}>
      {placementPrompt ? (
        <div className="image-board__placement-prompt" role="status" aria-live="polite">
          {placementPrompt}
        </div>
      ) : null}
      {ixBoardDocked ? (
        <div className="image-board__desktop-shell">
          {boardStage}
          <aside className="image-board__ix-dock" aria-label="Ix board">
            {ixBoardOverlay}
          </aside>
        </div>
      ) : (
        boardStage
      )}

      {showSellMelangePopup && !riseOfIx && (
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
