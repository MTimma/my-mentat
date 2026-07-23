import React from 'react'
import { getLeaderIconPath } from '../../data/leaders'
import { getBoardTrackerVariant, type BoardTrackerKind } from '../../data/boardTrackerStyles'
import type { Player } from '../../types/GameTypes'
import { playerMarkerHex } from '../../utils/playerColors'

export interface BoardTrackerProps {
  kind: BoardTrackerKind
  player: Player
  left: string
  top: string
  title: string
  marker: string
  dataAttrs?: Record<string, string | number | undefined>
}

const BoardTracker: React.FC<BoardTrackerProps> = ({
  kind,
  player,
  left,
  top,
  title,
  marker,
  dataAttrs,
}) => {
  const variant = getBoardTrackerVariant(kind)
  const color = playerMarkerHex(player)
  const leaderIcon = variant === 'portrait' ? getLeaderIconPath(player.leader.name) : undefined

  const dataProps = Object.fromEntries(
    Object.entries({ 'data-marker': marker, ...dataAttrs }).filter(([, value]) => value !== undefined),
  )

  if (variant === 'portrait' && leaderIcon) {
    return (
      <div
        className="image-board__tracker image-board__tracker--portrait"
        style={{ left, top }}
        title={title}
        {...dataProps}
      >
        <div
          className="image-board__tracker-portrait-ring"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <img
          src={leaderIcon}
          alt=""
          className="image-board__tracker-portrait-img"
          draggable={false}
          aria-hidden="true"
        />
      </div>
    )
  }

  const variantClass =
    variant === 'cube' ? 'image-board__tracker--cube' : 'image-board__tracker--circle'

  return (
    <div
      className={`image-board__tracker ${variantClass}`}
      style={{ left, top, backgroundColor: color }}
      title={title}
      {...dataProps}
    />
  )
}

export default BoardTracker
