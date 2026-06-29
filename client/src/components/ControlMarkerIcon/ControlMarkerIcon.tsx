import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import { playerColorClass } from '../../utils/playerColors'
import './ControlMarkerIcon.css'

export interface ControlMarkerIconProps {
  playerId: number
  color?: PlayerColor
  className?: string
}

const ControlMarkerIcon: React.FC<ControlMarkerIconProps> = ({
  playerId,
  color,
  className = '',
}) => (
  <span
    className={['control-marker-icon', playerColorClass(playerId, color), className]
      .filter(Boolean)
      .join(' ')}
    role="img"
    aria-hidden="true"
  />
)

export default ControlMarkerIcon
