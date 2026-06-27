import React from 'react'
import './TechTileFlipBadge.css'

export const TECH_TILE_FLIP_ICON = '/icon/flip.png'

export type TechTileFlipBadgeSize = 'inline' | 'compact' | 'gain'

export interface TechTileFlipBadgeProps {
  image?: string
  alt?: string
  size?: TechTileFlipBadgeSize
  className?: string
}

/** Face-down / used tech tile: dimmed art with flip overlay. */
const TechTileFlipBadge: React.FC<TechTileFlipBadgeProps> = ({
  image,
  alt = '',
  size = 'inline',
  className = '',
}) => (
  <span
    className={['tech-tile-flip-badge', `tech-tile-flip-badge--${size}`, className].filter(Boolean).join(' ')}
    aria-hidden={alt ? undefined : true}
    title={alt || undefined}
  >
    {image ? (
      <img src={image} alt="" className="tech-tile-flip-badge__tile" draggable={false} />
    ) : (
      <span className="tech-tile-flip-badge__placeholder" />
    )}
    <span className="tech-tile-flip-badge__shade" aria-hidden="true" />
    <img src={TECH_TILE_FLIP_ICON} alt="" className="tech-tile-flip-badge__flip" draggable={false} />
  </span>
)

export default TechTileFlipBadge
