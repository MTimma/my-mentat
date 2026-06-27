import React from 'react'
import DreadnoughtIcon from '../DreadnoughtIcon/DreadnoughtIcon'
import './AgentIcon.css'

interface AgentIconProps {
  playerId: number
  className?: string
  variant?: 'troop' | 'dreadnought'
}

const AgentIcon: React.FC<AgentIconProps> = ({ playerId, className = '', variant = 'troop' }) => {
  if (variant === 'dreadnought') {
    return (
      <DreadnoughtIcon
        playerId={playerId}
        appearance="card"
        className={['agent', 'agent--dreadnought', className].filter(Boolean).join(' ')}
      />
    )
  }

  return (
    <span
      className={['agent', `player-${playerId}`, className].filter(Boolean).join(' ')}
      role="img"
      aria-hidden="true"
    />
  )
}

export default AgentIcon
