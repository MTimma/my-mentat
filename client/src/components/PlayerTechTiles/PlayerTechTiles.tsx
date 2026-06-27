import React from 'react'
import type { TechTileId } from '../../data/techTiles'
import { getTechTile } from '../../data/techTiles'
import type { PlayerTechTile } from '../../data/techTiles'
import type { Player } from '../../types/GameTypes'
import TechTileFlipBadge from '../TechTileFlipBadge/TechTileFlipBadge'
import './PlayerTechTiles.css'

export interface PlayerTechTilesProps {
  tiles: PlayerTechTile[]
  /** `compact` for combat quadrants; `inline` for turn controls / modals. */
  variant?: 'compact' | 'inline'
  activatableTileIds?: Set<TechTileId>
  onTileClick?: (tileId: TechTileId) => void
  emptyLabel?: string
  ariaLabel?: string
}

const PlayerTechTiles: React.FC<PlayerTechTilesProps> = ({
  tiles,
  variant = 'inline',
  activatableTileIds,
  onTileClick,
  emptyLabel,
  ariaLabel = 'Owned technology tiles',
}) => {
  if (tiles.length === 0) {
    if (!emptyLabel) return null
    return (
      <div className={['player-tech-tiles', `player-tech-tiles--${variant}`, 'player-tech-tiles--empty'].join(' ')}>
        <span className="player-tech-tiles__empty">{emptyLabel}</span>
      </div>
    )
  }

  return (
    <div className={['player-tech-tiles', `player-tech-tiles--${variant}`].join(' ')} aria-label={ariaLabel}>
      {tiles.map((owned, index) => {
        const tile = getTechTile(owned.id)
        const activatable = activatableTileIds?.has(owned.id) ?? false
        const title = tile
          ? `${tile.name}${owned.faceUp ? '' : ' (used — flipped face-down)'}${activatable ? ' — click to activate' : ''}`
          : owned.id

        const content =
          owned.faceUp && tile ? (
            <img src={tile.image} alt="" className="player-tech-tiles__img" draggable={false} />
          ) : (
            <TechTileFlipBadge
              image={tile?.image}
              alt={tile?.name ?? owned.id}
              size={variant}
            />
          )

        if (onTileClick && (activatable || variant === 'inline')) {
          return (
            <button
              key={`${owned.id}-${index}`}
              type="button"
              className={[
                'player-tech-tiles__tile',
                activatable ? 'player-tech-tiles__tile--activatable' : '',
                !owned.faceUp ? 'player-tech-tiles__tile--face-down' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={title}
              disabled={!activatable && variant === 'compact'}
              onClick={() => onTileClick(owned.id)}
            >
              {content}
            </button>
          )
        }

        return (
          <span
            key={`${owned.id}-${index}`}
            className={[
              'player-tech-tiles__tile',
              'player-tech-tiles__tile--static',
              !owned.faceUp ? 'player-tech-tiles__tile--face-down' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            title={title}
          >
            {content}
          </span>
        )
      })}
    </div>
  )
}

export function ownedTechForPlayer(player: Player) {
  return player.tech ?? []
}

export default PlayerTechTiles
