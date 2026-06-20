import React from 'react'
import type { Player, SpaceProps } from '../../types/GameTypes'
import type { TechTileId } from '../../data/techTiles'
import { BOARD_SPACES } from '../../data/boardSpaces'
import {
  IX_BOARD_HOTSPOTS,
  IX_NEGOTIATOR_LANE_ANCHORS,
  IX_TECH_TILE_RECTS,
  layoutIxBoardOnStage,
} from '../../data/ixBoardAnchors'
import { tileById, canPlayerAffordTechTile } from '../../utils/techTiles'
import BoardAgentFigure from '../AgentIcon/AgentIcon'
import './IxBoardOverlay.css'

const PLAYER_COLORS: Record<number, string> = {
  0: '#d32f2f',
  1: '#388e3c',
  2: '#fbc02d',
  3: '#1976d2',
}

function playerMarkerColor(player: Player): string {
  const byId = PLAYER_COLORS[player.id]
  if (byId) return byId
  const map: Record<string, string> = {
    red: '#d32f2f',
    green: '#388e3c',
    yellow: '#fbc02d',
    blue: '#1976d2',
  }
  return map[player.color] ?? '#888'
}

export type IxBoardPlacement = 'embedded' | 'docked'

export interface IxBoardOverlayProps {
  players: Player[]
  occupiedSpaces: { [key: number]: number[] }
  stacks: TechTileId[][]
  onSpaceClick: (spaceId: number) => void
  isSpaceEnabled: (space: SpaceProps) => boolean
  highlightedAreas: SpaceProps['agentIcon'][]
  hotspotDebug?: boolean
  blockedSpaceMap: Map<number, number>
  /** `embedded` = overlay on Board.jpg; `docked` = standalone panel beside board (desktop). */
  placement?: IxBoardPlacement
  historyHighlightSpaceId?: number | null
  /** Sandbox setup: tech stack slots become click targets to pick face-up tiles. */
  sandboxTechSetup?: {
    onConfigure: () => void
    requiredFilledStacks: number
  }
  /** Active player on the main board (used for afford preview when no acquire reward). */
  currentPlayerId: number
  /** Active player may acquire a face-up tech tile (after Tech Negotiation, etc.). */
  techAcquire?: {
    playerId: number
    discount: number
    paySolariInsteadOfSpice?: boolean
  }
  /** Opens tech tile detail / acquire modal for a stack index. */
  onTechTileAcquire?: (stackIndex: number) => void
}

/** Same path as The Voice cards in `cards.ts` */
const VOICE_CARD_IMAGE_SRC = 'imperium_row/the_voice.avif'

const IxBoardOverlay: React.FC<IxBoardOverlayProps> = ({
  players,
  occupiedSpaces,
  stacks,
  onSpaceClick,
  isSpaceEnabled,
  highlightedAreas,
  hotspotDebug = false,
  blockedSpaceMap,
  placement = 'embedded',
  historyHighlightSpaceId = null,
  sandboxTechSetup,
  currentPlayerId,
  techAcquire,
  onTechTileAcquire,
}) => {
  const isDocked = placement === 'docked'
  const stageRect = isDocked ? null : layoutIxBoardOnStage()
  const spaceMap = new Map<number, SpaceProps>()
  BOARD_SPACES.forEach(s => spaceMap.set(s.id, s))

  const playersSorted = [...players].sort((a, b) => a.id - b.id)

  const faceUpCount = stacks.filter(stack => stack[0]).length
  const requiredFilledStacks = sandboxTechSetup?.requiredFilledStacks ?? 3
  const sandboxTechLabel = sandboxTechSetup
    ? requiredFilledStacks === 0
      ? 'All tech stacks empty'
      : faceUpCount === requiredFilledStacks
        ? 'Change tech tiles'
        : `Set tech tiles (${faceUpCount}/${requiredFilledStacks})`
    : ''

  const affordPlayerId = techAcquire?.playerId ?? currentPlayerId
  const affordPlayer = players.find(p => p.id === affordPlayerId)

  const canAffordStack = (stackIndex: number): boolean => {
    if (!affordPlayer) return false
    const tileId = stacks[stackIndex]?.[0]
    const tile = tileId ? tileById(tileId) : undefined
    if (!tile) return false
    return canPlayerAffordTechTile(affordPlayer, tile.cost, {
      discount: techAcquire?.discount ?? 0,
      paySolariInsteadOfSpice: techAcquire?.paySolariInsteadOfSpice,
    })
  }

  return (
    <div
      className={['ix-board-overlay', isDocked ? 'ix-board-overlay--docked' : ''].filter(Boolean).join(' ')}
      style={
        isDocked || !stageRect
          ? undefined
          : {
              left: `${stageRect.left}%`,
              top: `${stageRect.top}%`,
              width: `${stageRect.width}%`,
              height: `${stageRect.height}%`,
            }
      }
      data-marker="ix-board"
    >
      <img
        className="ix-board-overlay__img"
        src="/board/riseofix/riseofix2.png"
        alt="Ix board"
        draggable={false}
      />

      <div className="ix-board-overlay__layer">
        {playersSorted.map((player, laneIdx) => {
          const count = player.negotiatorsOnIx ?? 0
          const anchor = IX_NEGOTIATOR_LANE_ANCHORS[laneIdx]
          if (!anchor || count <= 0) return null
          return (
            <div
              key={`ix-neg-${player.id}`}
              className="ix-board-overlay__negotiator-lane"
              data-marker="ix-negotiator"
              data-player-id={player.id}
              style={{
                left: `${anchor.x}%`,
                top: `${anchor.y}%`,
                color: playerMarkerColor(player),
              }}
              title={`${player.leader.name}: ${count} negotiator${count === 1 ? '' : 's'} on Ix`}
            >
              {Array.from({ length: Math.min(count, 6) }, (_, index) => (
                <span key={index} className="ix-board-overlay__negotiator-square" aria-hidden="true" />
              ))}
              {count > 6 ? <span className="ix-board-overlay__negotiator-overflow">+{count - 6}</span> : null}
            </div>
          )
        })}

        {IX_TECH_TILE_RECTS.map(slot => {
          const tileId = stacks[slot.stackIndex]?.[0]
          const tile = tileId ? tileById(tileId) : undefined
          const slotStyle = {
            left: `${slot.left}%`,
            top: `${slot.top}%`,
            width: `${slot.width}%`,
            height: `${slot.height}%`,
          }

          if (sandboxTechSetup) {
            return (
              <button
                key={`tech-slot-${slot.stackIndex}`}
                type="button"
                className={[
                  'ix-board-overlay__tech-slot',
                  'ix-board-overlay__tech-slot--sandbox',
                  tile ? 'ix-board-overlay__tech-slot--filled' : 'ix-board-overlay__tech-slot--empty',
                ]
                  .filter(Boolean)
                  .join(' ')}
                data-marker="tech-tile"
                data-stack-index={slot.stackIndex}
                style={slotStyle}
                title={sandboxTechLabel}
                aria-label={sandboxTechLabel}
                onClick={sandboxTechSetup.onConfigure}
              >
                {tile ? (
                  <img
                    className="ix-board-overlay__tech-img"
                    src={tile.image}
                    alt={tile.name}
                    draggable={false}
                  />
                ) : null}
              </button>
            )
          }

          if (!tile) {
            return (
              <div
                key={`tech-slot-${slot.stackIndex}`}
                className="ix-board-overlay__tech-slot ix-board-overlay__tech-slot--empty"
                data-marker="tech-tile"
                data-stack-index={slot.stackIndex}
                style={slotStyle}
                title="Empty stack"
              />
            )
          }

          if (!onTechTileAcquire) {
            return (
              <div
                key={`tech-slot-${slot.stackIndex}`}
                className="ix-board-overlay__tech-slot"
                data-marker="tech-tile"
                data-stack-index={slot.stackIndex}
                style={slotStyle}
                title={`${tile.name} (${tile.cost} spice)`}
              >
                <img
                  className="ix-board-overlay__tech-img"
                  src={tile.image}
                  alt={tile.name}
                  draggable={false}
                />
              </div>
            )
          }

          const hasAcquireReward = Boolean(techAcquire)
          const affordable = canAffordStack(slot.stackIndex)
          const tileDimmed = !affordable

          return (
            <button
              key={`tech-slot-${slot.stackIndex}`}
              type="button"
              className={[
                'ix-board-overlay__tech-slot',
                'ix-board-overlay__tech-slot--interactive',
                hasAcquireReward && affordable
                  ? 'ix-board-overlay__tech-slot--affordable'
                  : '',
                !affordable ? 'ix-board-overlay__tech-slot--unaffordable' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-marker="tech-tile"
              data-stack-index={slot.stackIndex}
              style={slotStyle}
              title={
                hasAcquireReward
                  ? affordable
                    ? `Acquire ${tile.name} (${tile.cost} spice)`
                    : `View ${tile.name} — acquire reward active`
                  : affordable
                    ? `View ${tile.name} (${tile.cost} spice) — you can afford this`
                    : `View ${tile.name} (${tile.cost} spice) — need more spice`
              }
              aria-label={
                hasAcquireReward
                  ? affordable
                    ? `Acquire ${tile.name}`
                    : `View ${tile.name}`
                  : affordable
                    ? `View ${tile.name}, affordable`
                    : `View ${tile.name}, unaffordable`
              }
              onClick={() => onTechTileAcquire?.(slot.stackIndex)}
            >
              <img
                className={[
                  'ix-board-overlay__tech-img',
                  tileDimmed ? 'ix-board-overlay__tech-img--dimmed' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                src={tile.image}
                alt={tile.name}
                draggable={false}
              />
            </button>
          )
        })}

        {IX_BOARD_HOTSPOTS.map(hotspot => {
          const space = spaceMap.get(hotspot.spaceId)
          if (!space) return null

          const enabled = isSpaceEnabled(space)
          const isHighlighted = highlightedAreas?.includes(space.agentIcon) || false
          const blockedBy = blockedSpaceMap.get(space.id)
          const isVoiceBlocked = typeof blockedBy === 'number'
          const occupied = occupiedSpaces[space.id] || []
          const isOccupied = occupied.length > 0

          const classes = [
            'ix-board-overlay__hotspot',
            'image-board__hotspot',
            isHighlighted && enabled ? 'highlighted' : '',
            isOccupied ? 'occupied' : '',
            !enabled ? 'disabled' : '',
            isVoiceBlocked ? 'voice-blocked' : '',
          ]
            .filter(Boolean)
            .join(' ')

          const occupiedBg = isOccupied
            ? PLAYER_COLORS[occupied[occupied.length - 1]] || '#888'
            : undefined

          return (
            <button
              key={hotspot.spaceId}
              type="button"
              className={classes}
              style={{
                left: `${hotspot.left}%`,
                top: `${hotspot.top}%`,
                width: `${hotspot.width}%`,
                height: `${hotspot.height}%`,
                backgroundColor: occupiedBg ? `${occupiedBg}33` : undefined,
              }}
              title={space.name}
              data-space-id={hotspot.spaceId}
              data-space-name={space.name}
              onClick={() => onSpaceClick(space.id)}
              disabled={!enabled}
            />
          )
        })}

        {historyHighlightSpaceId != null &&
          IX_BOARD_HOTSPOTS.filter(h => h.spaceId === historyHighlightSpaceId).map(h => (
            <div
              key={`hist-${h.spaceId}`}
              className="image-board__history-space-highlight"
              style={{
                left: `${h.left}%`,
                top: `${h.top}%`,
                width: `${h.width}%`,
                height: `${h.height}%`,
              }}
              aria-hidden
            />
          ))}

        {[...blockedSpaceMap.entries()].map(([spaceId, blockerPlayerId]) => {
          const hotspot = IX_BOARD_HOTSPOTS.find(h => h.spaceId === spaceId)
          if (!hotspot) return null
          const ring = PLAYER_COLORS[blockerPlayerId] || '#ffa726'
          const x = hotspot.left + hotspot.width * (hotspot.agentX / 100)
          const y = hotspot.top + hotspot.height * (hotspot.agentY / 100)
          return (
            <div
              key={`ix-voice-${spaceId}`}
              className="ix-board-overlay__voice-block-thumb"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                boxShadow: `0 0 0 2px ${ring}, 0 2px 8px rgba(0,0,0,0.5)`,
              }}
              title="Blocked by The Voice this round"
            >
              <img src={VOICE_CARD_IMAGE_SRC} alt="" draggable={false} />
            </div>
          )
        })}

        {hotspotDebug &&
          IX_BOARD_HOTSPOTS.map(h => {
            const localAnchor = {
              x: h.left + h.width * (h.agentX / 100),
              y: h.top + h.height * (h.agentY / 100),
            }
            return (
              <div
                key={`ix-agent-anchor-${h.spaceId}`}
                className="ix-board-overlay__agent-anchor-debug"
                data-space-id={h.spaceId}
                style={{
                  left: `${localAnchor.x}%`,
                  top: `${localAnchor.y}%`,
                }}
                title={`Ix agent anchor ${h.spaceId}`}
              />
            )
          })}

        {IX_BOARD_HOTSPOTS.flatMap(hotspot => {
          const occupied = occupiedSpaces[hotspot.spaceId] || []
          if (occupied.length === 0) return []

          return occupied.map((playerId, idx) => (
            <div
              key={`ix-agent-${hotspot.spaceId}-${playerId}-${idx}`}
              className="image-board__marker"
              style={{
                left: `${hotspot.left + hotspot.width * (hotspot.agentX / 100) + idx * 1.2}%`,
                top: `${hotspot.top + hotspot.height * (hotspot.agentY / 100)}%`,
              }}
            >
              <BoardAgentFigure playerId={playerId} className="image-board__agent-figure" />
            </div>
          ))
        })}
      </div>
    </div>
  )
}

export default IxBoardOverlay
