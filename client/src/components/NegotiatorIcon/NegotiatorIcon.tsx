import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import { playerColorClass } from '../../utils/playerColors'
import './NegotiatorIcon.css'

export interface NegotiatorIconProps {
  playerId: number
  color?: PlayerColor
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const NegotiatorIcon: React.FC<NegotiatorIconProps> = ({
  playerId,
  color,
  className = '',
  size = 'md',
}) => (
  <span
    className={[
      'negotiator-icon',
      `negotiator-icon--${size}`,
      playerColorClass(playerId, color),
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
