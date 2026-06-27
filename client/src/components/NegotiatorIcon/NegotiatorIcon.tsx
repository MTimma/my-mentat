import React from 'react'
import './NegotiatorIcon.css'

export interface NegotiatorIconProps {
  playerId: number
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const NegotiatorIcon: React.FC<NegotiatorIconProps> = ({
  playerId,
  className = '',
  size = 'md',
}) => (
  <span
    className={[
      'negotiator-icon',
      `negotiator-icon--${size}`,
      `player-${playerId}`,
      className,
    ]
      .filter(Boolean)
      .join(' ')}
    role="img"
    aria-hidden="true"
  >
    <img src="/icon/tech_neg.png" alt="" className="negotiator-icon__img" />
    <span className="negotiator-icon__player-band" />
  </span>
)

export default NegotiatorIcon
