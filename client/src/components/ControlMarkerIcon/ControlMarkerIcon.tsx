import React from 'react'
import './ControlMarkerIcon.css'

export interface ControlMarkerIconProps {
  playerId: number
  className?: string
}

const ControlMarkerIcon: React.FC<ControlMarkerIconProps> = ({ playerId, className = '' }) => (
  <span
    className={['control-marker-icon', `player-${playerId}`, className].filter(Boolean).join(' ')}
    role="img"
    aria-hidden="true"
  />
)

export default ControlMarkerIcon
