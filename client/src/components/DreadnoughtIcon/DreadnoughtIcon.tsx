import React from 'react'
import './DreadnoughtIcon.css'

export type DreadnoughtIconAppearance = 'card' | 'control'

export interface DreadnoughtIconProps {
  playerId: number
  className?: string
  /** `card` — art as-is (default). `control` — player-tinted piece on area control only. */
  appearance?: DreadnoughtIconAppearance
}

const DreadnoughtIcon: React.FC<DreadnoughtIconProps> = ({
  playerId,
  className = '',
  appearance = 'card',
}) => {
  if (appearance === 'card') {
    return (
      <img
        src="/icon/dreadnought_card.png"
        alt=""
        className={['dreadnought-icon', 'dreadnought-icon--card', className].filter(Boolean).join(' ')}
        aria-hidden="true"
        draggable={false}
      />
    )
  }

  return (
    <span
      className={[
        'dreadnought-icon',
        'dreadnought-icon--control',
        `player-${playerId}`,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      role="img"
      aria-hidden="true"
    />
  )
}

export default DreadnoughtIcon
