import React from 'react'
import { CustomEffect } from '../../types/GameTypes'
import './FreighterIcon.css'

export type FreighterArrowDirection = 'up' | 'down'

export interface FreighterIconProps {
  /** Advance = up, Recall = down. Omit for the base shipping icon only. */
  direction?: FreighterArrowDirection
  className?: string
  size?: 'sm' | 'md' | 'lg'
  title?: string
}

export function freighterArrowDirectionFromCustom(
  custom: CustomEffect | undefined
): FreighterArrowDirection | undefined {
  if (custom === CustomEffect.FREIGHTER_ADVANCE) return 'up'
  if (custom === CustomEffect.FREIGHTER_RECALL) return 'down'
  return undefined
}

function FreighterArrow({ direction }: { direction: FreighterArrowDirection }) {
  const up = direction === 'up'
  return (
    <svg
      className={`freighter-icon__arrow freighter-icon__arrow--${direction}`}
      viewBox="0 0 12 14"
      aria-hidden="true"
    >
      <path
        d={up ? 'M6 1.5 L10.5 11.5 H1.5 Z' : 'M6 12.5 L10.5 2.5 H1.5 Z'}
        fill="currentColor"
        stroke="#1a1208"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const FreighterIcon: React.FC<FreighterIconProps> = ({
  direction,
  className = '',
  size = 'md',
  title,
}) => (
  <span
    className={[
      'freighter-icon',
      `freighter-icon--${size}`,
      direction ? `freighter-icon--${direction}` : '',
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    role="img"
    aria-label={title}
    title={title}
  >
    <img src="/icon/shipping.png" alt="" className="freighter-icon__ship" draggable={false} />
    {direction ? <FreighterArrow direction={direction} /> : null}
  </span>
)

export default FreighterIcon
