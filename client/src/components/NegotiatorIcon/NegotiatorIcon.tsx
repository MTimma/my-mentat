import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import './NegotiatorIcon.css'

export interface NegotiatorIconProps {
  /** Kept for call-site compatibility; icon uses original art (no player tint). */
  playerId: number
  color?: PlayerColor
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const NegotiatorIcon: React.FC<NegotiatorIconProps> = ({
  className = '',
  size = 'md',
}) => (
  <span
    className={['negotiator-icon', `negotiator-icon--${size}`, className].filter(Boolean).join(' ')}
    role="img"
    aria-hidden="true"
  >
    <img src="/icon/tech_neg.png" alt="" className="negotiator-icon__img" />
  </span>
)

export default NegotiatorIcon
