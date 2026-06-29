import React from 'react'
import { PlayerColor } from '../../types/GameTypes'
import { playerColorClass } from '../../utils/playerColors'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import './AgentIcon.css'

interface AgentIconProps {
  playerId: number
  /** When set, tints by assigned seat color instead of default id→color mapping. */
  color?: PlayerColor
  className?: string
  variant?: 'troop' | 'dreadnought'
}

const AgentIcon: React.FC<AgentIconProps> = ({
  playerId,
  color,
  className = '',
  variant = 'troop',
}) => {
  if (variant === 'dreadnought') {
    return (
      <DreadnoughtIcon
        playerId={playerId}
        color={color}
        appearance="card"
        className={['agent', 'agent--dreadnought', className].filter(Boolean).join(' ')}
      />
    )
  }

  return (
    <span
      className={['agent', playerColorClass(playerId, color), className].filter(Boolean).join(' ')}
      role="img"
      aria-hidden="true"
    />
  )
}

export default AgentIcon
